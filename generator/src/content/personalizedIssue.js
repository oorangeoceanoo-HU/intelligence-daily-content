"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompletePersonalizedIssue = void 0;
exports.buildPersonalizedDailyIssue = buildPersonalizedDailyIssue;
const candidateGenerator_1 = require("./candidateGenerator");
const dailyIssueBuilder_1 = require("./dailyIssueBuilder");
const editionIssueMerger_1 = require("./editionIssueMerger");
const profileMapping_1 = require("./profileMapping");
const textSimilarity_1 = require("./textSimilarity");
const isCompletePersonalizedIssue = (issue, minimumCards = 15) => issue.cards.length >= minimumCards && issue.pageCount === 3;
exports.isCompletePersonalizedIssue = isCompletePersonalizedIssue;
const specificIndustries = (items) => items.filter((item) => item !== "generalPublic" && item !== "localLife");
const specializedCategories = [
    "ai",
    "product",
    "technology",
    "education",
    "hr",
    "operations",
    "finance",
    "healthcare",
    "ecommerce",
    "consumer",
    "creator",
    "startup",
    "design",
    "lightTrend"
];
const publicCategories = ["world", "china", "local", "policy", "disaster", "publicSafety"];
const businessCategories = ["finance", "operations", "ecommerce", "consumer", "startup"];
const focusedIndustryRequirements = [
    {
        industries: ["teacher", "educationResearch"],
        categories: ["education"],
        sourceIds: ["moe-cn", "cas-science-news", "arxiv-cs-api"]
    },
    {
        industries: ["hrRecruiting"],
        categories: ["hr"],
        sourceIds: ["chrm-mohrss", "mohrss-cn"]
    },
    {
        industries: ["communicationsResearch"],
        categories: ["technology"],
        sourceIds: ["arxiv-cs-api", "cas-science-news"]
    }
];
const intersects = (left, right) => left.some((item) => right.includes(item));
const unique = (items) => Array.from(new Set(items));
const normalizeText = (value) => value.trim().toLocaleLowerCase();
const topicMatchesCandidate = (topic, candidate) => {
    const categories = (0, profileMapping_1.deriveTopicCategories)(topic);
    const industries = specificIndustries((0, profileMapping_1.deriveTopicIndustryTags)(topic));
    const haystack = normalizeText([
        candidate.title,
        candidate.oneLine,
        candidate.body.keyProgress,
        candidate.body.whatToWatch
    ].filter(Boolean).join(" "));
    const normalizedTopic = normalizeText(topic).replace(/[\/\s]+/gu, "");
    return (intersects(candidate.categories, categories) ||
        intersects(specificIndustries(candidate.industries), industries) ||
        (normalizedTopic.length >= 2 && haystack.replace(/\s+/gu, "").includes(normalizedTopic)));
};
const temporaryFocusMatches = (focus, candidate) => {
    const title = focus.title?.trim();
    if (!title) {
        return false;
    }
    if (focus.kind === "城市" && candidate.locations.includes(title)) {
        return true;
    }
    return topicMatchesCandidate(title, candidate) || normalizeText(candidate.title).includes(normalizeText(title));
};
const preferenceAdjustment = (candidate, preferences) => {
    const matchedEntries = Object.entries(preferences.topicIntensity ?? {})
        .filter(([topic]) => topicMatchesCandidate(topic, candidate));
    const values = matchedEntries.map(([, value]) => value);
    const temporaryMatches = (preferences.temporaryFocus ?? [])
        .filter((focus) => temporaryFocusMatches(focus, candidate));
    const feedbackMatches = Object.values(preferences.contentFeedback ?? {}).filter((feedback) => {
        const feedbackText = [feedback.title, feedback.scope].filter(Boolean).join(" ");
        return (0, textSimilarity_1.textSimilarity)(feedbackText, candidate.title) >= 0.2 ||
            (0, textSimilarity_1.textSimilarity)(feedbackText, candidate.oneLine) >= 0.16;
    });
    const hasPriority = values.includes("重点");
    const hasBlocked = values.includes("不看") && !hasPriority;
    const hasNotInterested = feedbackMatches.some((feedback) => feedback.action === "not_interested");
    const hasLessFeedback = feedbackMatches.some((feedback) => feedback.action === "less");
    const hasMoreFeedback = feedbackMatches.some((feedback) => feedback.action === "more");
    const adjustment = (hasPriority ? 15 : 0) +
        (values.includes("少看") ? -10 : 0) +
        temporaryMatches.length * 12 +
        (hasMoreFeedback ? 12 : 0) +
        (hasLessFeedback ? -12 : 0) +
        (hasNotInterested ? -24 : 0);
    return {
        adjustment,
        blocked: hasBlocked || hasNotInterested,
        temporaryMatches
    };
};
const industryMatchesForProfile = (candidate, profile) => {
    const topics = [...profile.careerDirections, ...profile.interests];
    // Local reminders and public-policy tags are useful profile signals, but
    // they must not turn a general disaster or diplomatic story into an
    // industry card. Industry pages only count a topic when it has a
    // specialized category or a specialized industry tag.
    return topics.filter((topic) => {
        const categories = (0, profileMapping_1.deriveTopicCategories)(topic)
            .filter((category) => specializedCategories.includes(category));
        const industries = specificIndustries((0, profileMapping_1.deriveTopicIndustryTags)(topic));
        if (!categories.length && !industries.length) {
            return false;
        }
        const haystack = normalizeText([
            candidate.title,
            candidate.oneLine,
            candidate.body.keyProgress,
            candidate.body.whatToWatch
        ].filter(Boolean).join(" "));
        const normalizedTopic = normalizeText(topic).replace(/[\/\s]+/gu, "");
        const candidateCategories = candidate.categories ?? [];
        const candidateIndustries = specificIndustries(candidate.industries ?? []);
        const candidateSources = [
            ...(candidate.sourceIds ?? []),
            ...(candidate.sourceLinks ?? []).map((source) => source.sourceId).filter(Boolean)
        ];
        const candidateIsPublic = intersects(candidateCategories, publicCategories);
        const topicNeedsSpecificSubject = intersects(categories, ["ai", "product"]);
        // A generic "technology" tag is useful for an engineer, but it is too
        // broad for an AI/product preference. AI/product profiles need the
        // explicit AI or product signal instead of every technology article.
        const categorySignals = categories.filter((category) =>
            !(topicNeedsSpecificSubject && (category === "technology" || businessCategories.includes(category))));
        const industrySignals = industries.filter((industry) =>
            !(topicNeedsSpecificSubject && ["operationsGrowth", "financeInvestment", "ecommerceRetail", "consumerBrand", "startupBusiness"].includes(industry)));
        const candidateSpecificCategories = candidateCategories.filter((category) =>
            !publicCategories.includes(category) && !businessCategories.includes(category));
        const businessEvidence = candidateIsPublic &&
            intersects(candidateCategories, businessCategories) &&
            /经济|贸易|经贸|关税|企业|公司|市场|消费|零售|电商|汽车|金融|投资|利润|行业|营收|价格|economy|economic|trade|tariff|market|company|companies|business|investment|profit|industry|revenue|stocks?/iu.test(haystack);
        const candidateDomainEvidence = candidateSpecificCategories.length > 0 || businessEvidence;
        const focusedRequirement = focusedIndustryRequirements.find((requirement) =>
            intersects(industrySignals, requirement.industries));
        const focusedEvidence = !focusedRequirement ||
            intersects(candidateCategories, focusedRequirement.categories) ||
            intersects(candidateSources, focusedRequirement.sourceIds);
        const categoryMatch = intersects(candidateCategories, categorySignals) &&
            (!candidateIsPublic || !intersects(categorySignals, businessCategories) || candidateDomainEvidence) &&
            focusedEvidence;
        const industryTagMatch = intersects(candidateIndustries, industrySignals) &&
            (!candidateIsPublic || candidateDomainEvidence) &&
            focusedEvidence;
        const textMatch = normalizedTopic.length >= 2 &&
            haystack.replace(/\s+/gu, "").includes(normalizedTopic) &&
            (!candidateIsPublic || candidateDomainEvidence) &&
            focusedEvidence;
        return categoryMatch || industryTagMatch || textMatch;
    });
};
const layerMatchesFor = (candidate, rankedCandidate, profile) => {
    const cities = [profile.livingCity, profile.hometownCity].filter(Boolean);
    const cityMatch = intersects(candidate.locations, cities);
    const countries = [profile.country, profile.hometownCountry].filter(Boolean);
    const countryMatch = intersects(candidate.regions, countries);
    const professionalMatch = industryMatchesForProfile(candidate, profile).length > 0;
    const sharedMatch = rankedCandidate.matchedLaneIds.includes("mustKnow") ||
        (rankedCandidate.matchedLaneIds.includes("risk") &&
            (candidate.impactScore >= 72 || candidate.severityScore >= 72));
    return {
        shared: sharedMatch,
        professional: professionalMatch,
        local: cityMatch || countryMatch,
        trend: rankedCandidate.matchedLaneIds.includes("light")
    };
};
const rankPoolForProfile = (pool, profile, preferences) => pool
    .map((item) => {
    const rankedCandidate = (0, candidateGenerator_1.rankCandidateForProfile)(item.candidate, profile);
    const preference = preferenceAdjustment(item.candidate, preferences);
    const layerMatches = layerMatchesFor(item.candidate, rankedCandidate, profile);
    const adjustedScore = Math.max(0, Math.min(100, rankedCandidate.finalScore + preference.adjustment));
    const isProtectedSharedItem = layerMatches.shared && rankedCandidate.importanceScore.level === "S";
    return {
        ...item,
        rankedCandidate: { ...rankedCandidate, finalScore: adjustedScore },
        adjustedScore,
        layerMatches,
        blockedByPreference: preference.blocked && !isProtectedSharedItem
    };
    })
    .filter((item) => !item.blockedByPreference)
    .sort((left, right) => {
    const importanceDifference = right.rankedCandidate.importanceScore.total - left.rankedCandidate.importanceScore.total;
        return importanceDifference || right.adjustedScore - left.adjustedScore;
    });
const normalizedEventTitle = (value) => (value ?? "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
const dedupeRankedEvents = (ranked) => {
    const result = [];
    const indexesByTitle = new Map();
    ranked.forEach((item) => {
        const key = normalizedEventTitle(item.candidate.title);
        const existingIndex = indexesByTitle.get(key);
        if (existingIndex === undefined || !key) {
            indexesByTitle.set(key, result.length);
            result.push(item);
            return;
        }
        const existing = result[existingIndex];
        if (item.adjustedScore > existing.adjustedScore ||
            (item.adjustedScore === existing.adjustedScore && item.candidate.freshnessScore > existing.candidate.freshnessScore)) {
            result[existingIndex] = item;
        }
    });
    return result;
};
const resolveTargetCount = (ranked, minimumCards, comfortableMaxCards, absoluteMaxCards) => {
    const available = ranked.length;
    const strongCount = ranked.filter((item) => item.rankedCandidate.importanceScore.level === "S" ||
        item.rankedCandidate.importanceScore.level === "A" ||
        item.adjustedScore >= 52).length;
    const exceptionalCount = ranked.filter((item) => item.rankedCandidate.importanceScore.level === "S" || item.adjustedScore >= 70).length;
    const comfortableTarget = Math.max(minimumCards, Math.min(comfortableMaxCards, strongCount));
    const exceptionalExtra = Math.max(0, Math.min(absoluteMaxCards - comfortableMaxCards, exceptionalCount - comfortableMaxCards));
    return Math.min(available, comfortableTarget + exceptionalExtra);
};
const layerTargetsFor = (targetCount, availableProfessionalCount, enforceContentMix) => {
    // The product promise is one public-news page plus two personalized
    // pages. Seven to eight cards keep the public page readable; the rest is
    // reserved for the user's selected professional directions.
    const desiredGeneral = targetCount < 15
        ? Math.min(targetCount, Math.max(1, Math.round(targetCount * 0.3)))
        : Math.min(8, Math.max(7, Math.round(targetCount * 0.3)));
    const maxGeneralForMix = enforceContentMix
        ? Math.max(0, Math.floor(availableProfessionalCount / 0.65) - availableProfessionalCount)
        : desiredGeneral;
    const general = Math.min(desiredGeneral, maxGeneralForMix, targetCount);
    return {
        general,
        shared: general,
        professional: Math.max(0, targetCount - general),
        local: 0,
        trend: 0
    };
};
const selectBalancedItems = (ranked, targetCount, targets) => {
    const selected = [];
    const selectedIds = new Set();
    const layerCounts = {
        general: 0,
        shared: 0,
        professional: 0,
        local: 0,
        trend: 0
    };
    const take = (items, limit, selectedLayer) => {
        items.forEach((item) => {
            if (selected.length >= targetCount ||
                selectedIds.has(item.candidate.id) ||
                selected.filter((entry) => entry.selectedLayer === selectedLayer).length >= limit) {
                return;
            }
            selected.push({ ...item, selectedLayer });
            selectedIds.add(item.candidate.id);
            layerCounts[selectedLayer] += 1;
        });
    };
    const professional = ranked
        .filter((item) => item.layerMatches.professional)
        .sort((left, right) => right.adjustedScore - left.adjustedScore);
    const general = ranked
        .filter((item) => !item.layerMatches.professional &&
        (item.layerMatches.shared || item.layerMatches.local || item.layerMatches.trend))
        .sort((left, right) => {
        const leftShared = left.layerMatches.shared ? 1 : 0;
        const rightShared = right.layerMatches.shared ? 1 : 0;
        return rightShared - leftShared || right.adjustedScore - left.adjustedScore;
    });
    // Select the professional lane first so it cannot be crowded out by S/A
    // public stories. The general lane is capped at one page.
    take(professional, targets.professional, "professional");
    take(general, targets.general, "general");
    // If the source pool is temporarily short, use remaining candidates only
    // as an explicit fallback. The completeness check below will keep such an
    // issue out of the personalized publication path.
    ranked.forEach((item) => {
        if (selected.length >= targetCount || selectedIds.has(item.candidate.id)) {
            return;
        }
        selected.push({ ...item, selectedLayer: item.layerMatches.professional ? "professional" : "fallback" });
        selectedIds.add(item.candidate.id);
        if (item.layerMatches.professional) {
            layerCounts.professional += 1;
        }
    });
    return { selected, layerCounts };
};
const relevanceTextFor = (item, profile) => {
    const candidate = item.candidate;
    const cityHits = candidate.locations.filter((city) => [profile.livingCity, profile.hometownCity].includes(city));
    const topicHits = industryMatchesForProfile(candidate, profile);
    if (cityHits.includes(profile.livingCity) && profile.livingCity) {
        return `你目前居住在${profile.livingCity}，这条信息与当地政策、公共服务或日常安排直接相关，建议优先确认具体生效时间和适用范围。`;
    }
    if (cityHits.includes(profile.hometownCity) && profile.hometownCity) {
        return `这条信息涉及你的家乡${profile.hometownCity}。如果家人仍在当地，可以留意后续执行范围以及是否需要提前调整出行或办事安排。`;
    }
    if (item.selectedLayer === "local" && profile.country) {
        if (candidate.regions.includes(profile.hometownCountry) && profile.hometownCountry !== profile.country) {
            return `这条信息涉及你的家乡所在国家${profile.hometownCountry}。如果家人仍在当地，可以留意后续执行范围以及是否影响生活或出行安排。`;
        }
        return `你目前所在国家是${profile.country}，这项变化可能影响当地生活、工作或跨境安排，值得关注后续实施细则。`;
    }
    if (item.selectedLayer === "professional" && topicHits.length) {
        return `你关注${topicHits.slice(0, 2).join("、")}，这条信息可能影响近期判断、工作方法或行业预期，建议重点留意后续落地和同类机构的反应。`;
    }
    if (item.selectedLayer === "trend") {
        return "这条信息不是必须立即处理的风险提醒，但能补充近期市场和大众关注方向，可作为轻量了解。";
    }
    if (item.selectedLayer === "fallback") {
        return "这条信息与你当前设置的职业和城市没有直接关联，但属于今天仍值得了解的公共变化，可快速浏览核心进展。";
    }
    return "这是影响范围较大的公共事件。即使它暂时不直接改变你的日常安排，也值得掌握核心进展和下一步风险。";
};
const toRankedCardInput = (item, profile, homePage) => ({
    rankedCandidate: item.rankedCandidate,
    card: {
        ...item.card,
        personalizationLayer: item.selectedLayer === "professional"
            ? "industry"
            : item.selectedLayer === "fallback" ? "fallback" : "general",
        homePage,
        importance: item.rankedCandidate.importanceScore.level,
        section: item.rankedCandidate.targetSection,
        tags: unique([
            item.rankedCandidate.importanceScore.level,
            ...item.rankedCandidate.matchedLaneIds,
            ...item.card.tags
        ]).slice(0, 8),
        body: {
            ...item.card.body,
            userRelevance: relevanceTextFor(item, profile)
        }
    }
});
function buildPersonalizedDailyIssue(params) {
    const preferences = {
        topicIntensity: params.preferences?.topicIntensity ?? {},
        temporaryFocus: params.preferences?.temporaryFocus ?? [],
        pushPlan: params.preferences?.pushPlan,
        contentFeedback: params.preferences?.contentFeedback ?? {}
    };
    const minimumCards = params.minimumCards ?? 20;
    const comfortableMaxCards = params.comfortableMaxCards ?? 20;
    const absoluteMaxCards = params.absoluteMaxCards ?? 24;
    const ranked = dedupeRankedEvents(rankPoolForProfile(params.pool, params.profile, preferences));
    const initialTargetCount = resolveTargetCount(ranked, minimumCards, comfortableMaxCards, absoluteMaxCards);
    const availableProfessionalCount = ranked.filter((item) => item.layerMatches.professional).length;
    const enforceContentMix = minimumCards >= 15;
    const mixCapacity = availableProfessionalCount
        ? Math.floor(availableProfessionalCount / 0.65)
        : 1;
    const targetCount = enforceContentMix
        ? Math.max(1, Math.min(initialTargetCount, mixCapacity))
        : initialTargetCount;
    const layerTargets = layerTargetsFor(targetCount, availableProfessionalCount, enforceContentMix);
    const selection = selectBalancedItems(ranked, targetCount, layerTargets);
    const generalCards = selection.selected.filter((item) => item.selectedLayer !== "professional");
    const industryCards = selection.selected.filter((item) => item.selectedLayer === "professional");
    const cardsForIssue = [...generalCards, ...industryCards];
    const generalPageSize = Math.max(1, Math.ceil(generalCards.length / 1));
    const industryOffset = generalCards.length;
    const incremental = (0, dailyIssueBuilder_1.buildDailyIssue)({
        userId: params.userId,
        date: params.date,
        publishableCards: cardsForIssue.map((item, index) => toRankedCardInput(item, params.profile, index < generalPageSize ? 1 : (index - industryOffset) % 2 === 0 ? 2 : 3)),
        maxCards: Math.max(1, targetCount),
        sizingRules: {
            minimumCards: Math.min(minimumCards, Math.max(1, targetCount)),
            comfortableMaxCards: Math.max(1, targetCount),
            absoluteMaxCards: Math.max(1, targetCount)
        },
        selectionLimits: {
            // Specialized feeds can legitimately be concentrated in a small
            // number of trusted sources. Keep a source cap for diversity, but
            // do not let it prevent a complete AI, education, or HR issue.
            maxCardsPerSource: 10,
            maxCardsPerSection: 16,
            minimumFallbackMaxCardsPerSource: 8,
            minimumFallbackMaxCardsPerSection: 14
        },
        generatedAt: params.generatedAt,
        edition: params.edition,
        editionLabel: params.editionLabel,
        coverageWindow: params.coverageWindow
    }).issue;
    const incrementalCardIds = new Set(incremental.cards.map((card) => card.id));
    const publishedLayerCounts = selection.selected.reduce((counts, item) => {
        if (incrementalCardIds.has(item.card.id)) {
            Object.keys(item.layerMatches).forEach((layer) => {
                if (item.layerMatches[layer]) {
                    counts[layer] += 1;
                }
            });
        }
        return counts;
    }, { general: 0, industry: 0, shared: 0, professional: 0, local: 0, trend: 0 });
    const merged = params.baseIssue
        ? (0, editionIssueMerger_1.mergeEditionIssue)({
            baseIssue: params.baseIssue,
            incrementalIssue: incremental,
            maxCards: absoluteMaxCards
        }).issue
        : {
            ...incremental,
            editionCardIds: incremental.cards.map((card) => card.id),
            carriedCardIds: []
        };
    const profileKey = [
        params.profile.country,
        params.profile.livingCity,
        params.profile.hometownCountry,
        params.profile.hometownCity,
        ...params.profile.careerDirections,
        ...params.profile.interests
    ].join("|");
    const mergedGeneralCardCount = merged.cards.filter((card) => card.personalizationLayer === "general").length;
    const mergedIndustryCardCount = merged.cards.filter((card) => card.personalizationLayer === "industry").length;
    const mergedFallbackCardCount = merged.cards.filter((card) => card.personalizationLayer === "fallback").length;
    // The final card count can be lower than the candidate target after the
    // shared issue builder applies source and quality limits. Judge the mix on
    // what the user will actually read: at least roughly 65% industry cards,
    // with no more than eight general-news cards in the first page.
    const requiredIndustryCardCount = Math.ceil(merged.cards.length * 0.65);
    const mixReasons = [];
    if (mergedGeneralCardCount > layerTargets.general) {
        mixReasons.push(`综合卡片超过上限（${mergedGeneralCardCount}/${layerTargets.general}）`);
    }
    if (mergedIndustryCardCount < requiredIndustryCardCount) {
        mixReasons.push(`行业卡片不足（${mergedIndustryCardCount}/${requiredIndustryCardCount}）`);
    }
    if (mergedFallbackCardCount > 0) {
        mixReasons.push(`含有${mergedFallbackCardCount}条无关回退内容`);
    }
    if (merged.cards.length < 15 || merged.pageCount !== 3) {
        mixReasons.push(`日报未达到15条且三版的完整规格（${merged.cards.length}条/${merged.pageCount}版）`);
    }
    publishedLayerCounts.general = mergedGeneralCardCount;
    publishedLayerCounts.industry = mergedIndustryCardCount;
    return {
        issue: merged,
        summary: {
            profileKey,
            selectedCardCount: merged.cards.length,
            availableCandidateCount: ranked.length,
            layerTargets,
            layerCounts: publishedLayerCounts,
            generalCardCount: mergedGeneralCardCount,
            industryCardCount: mergedIndustryCardCount,
            requiredIndustryCardCount,
            matchedCountry: params.profile.country,
            matchedCountries: unique([params.profile.country, params.profile.hometownCountry].filter(Boolean)),
            matchedCities: unique([params.profile.livingCity, params.profile.hometownCity].filter(Boolean)),
            matchedCareerDirections: params.profile.careerDirections,
            matchedInterests: params.profile.interests,
            fallbackCardCount: mergedFallbackCardCount,
            availableProfessionalCount,
            mixCapacity,
            mixReasons,
            meetsContentMix: mergedGeneralCardCount <= layerTargets.general &&
                mergedIndustryCardCount >= requiredIndustryCardCount &&
                mergedFallbackCardCount === 0 &&
                merged.cards.length >= 15 &&
                merged.pageCount === 3
        }
    };
}

