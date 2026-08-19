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
    return topics.filter((topic) => topicMatchesCandidate(topic, candidate));
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
const layerTargetsFor = (targetCount) => {
    const shared = Math.round(targetCount * 0.35);
    const professional = Math.round(targetCount * 0.4);
    const local = Math.round(targetCount * 0.2);
    const trend = Math.max(0, targetCount - shared - professional - local);
    return { shared, professional, local, trend };
};
const selectBalancedItems = (ranked, targetCount, targets) => {
    const selected = [];
    const selectedIds = new Set();
    const layerCounts = {
        shared: 0,
        professional: 0,
        local: 0,
        trend: 0
    };
    ranked
        .filter((item) => item.layerMatches.shared && item.rankedCandidate.importanceScore.level === "S")
        .forEach((item) => {
        if (selected.length >= targetCount || selectedIds.has(item.candidate.id)) {
            return;
        }
        selected.push({ ...item, selectedLayer: "shared" });
        selectedIds.add(item.candidate.id);
        layerCounts.shared += 1;
    });
    const takeFromLayer = (layer) => {
        const candidates = ranked
            .filter((item) => item.layerMatches[layer])
            .sort((left, right) => {
            const importanceDifference = right.rankedCandidate.importanceScore.total -
                left.rankedCandidate.importanceScore.total;
            if (importanceDifference) {
                return importanceDifference;
            }
            const leftOverlap = Object.values(left.layerMatches).filter(Boolean).length;
            const rightOverlap = Object.values(right.layerMatches).filter(Boolean).length;
            return leftOverlap - rightOverlap;
        });
        candidates.forEach((item) => {
            if (selected.length >= targetCount ||
                layerCounts[layer] >= targets[layer] ||
                selectedIds.has(item.candidate.id) ||
                !item.layerMatches[layer]) {
                return;
            }
            selected.push({ ...item, selectedLayer: layer });
            selectedIds.add(item.candidate.id);
            layerCounts[layer] += 1;
        });
    };
    // Shared and local information have the least replaceable value. Professional
    // information then receives the largest remaining share, followed by light trends.
    ["shared", "local", "professional", "trend"].forEach(takeFromLayer);
    ranked.forEach((item) => {
        if (selected.length >= targetCount || selectedIds.has(item.candidate.id)) {
            return;
        }
        const selectedLayer = Object.keys(item.layerMatches)
            .find((layer) => item.layerMatches[layer]) ?? "fallback";
        selected.push({ ...item, selectedLayer });
        selectedIds.add(item.candidate.id);
        if (selectedLayer !== "fallback") {
            layerCounts[selectedLayer] += 1;
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
const toRankedCardInput = (item, profile) => ({
    rankedCandidate: item.rankedCandidate,
    card: {
        ...item.card,
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
    const minimumCards = params.minimumCards ?? 15;
    const comfortableMaxCards = params.comfortableMaxCards ?? 20;
    const absoluteMaxCards = params.absoluteMaxCards ?? 24;
    const ranked = rankPoolForProfile(params.pool, params.profile, preferences);
    const targetCount = resolveTargetCount(ranked, minimumCards, comfortableMaxCards, absoluteMaxCards);
    const layerTargets = layerTargetsFor(targetCount);
    const selection = selectBalancedItems(ranked, targetCount, layerTargets);
    const incremental = (0, dailyIssueBuilder_1.buildDailyIssue)({
        userId: params.userId,
        date: params.date,
        publishableCards: selection.selected.map((item) => toRankedCardInput(item, params.profile)),
        maxCards: Math.max(1, targetCount),
        sizingRules: {
            minimumCards: Math.min(minimumCards, Math.max(1, targetCount)),
            comfortableMaxCards: Math.max(1, targetCount),
            absoluteMaxCards: Math.max(1, targetCount)
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
    }, { shared: 0, professional: 0, local: 0, trend: 0 });
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
    return {
        issue: merged,
        summary: {
            profileKey,
            selectedCardCount: merged.cards.length,
            availableCandidateCount: ranked.length,
            layerTargets,
            layerCounts: publishedLayerCounts,
            matchedCountry: params.profile.country,
            matchedCountries: unique([params.profile.country, params.profile.hometownCountry].filter(Boolean)),
            matchedCities: unique([params.profile.livingCity, params.profile.hometownCity].filter(Boolean)),
            matchedCareerDirections: params.profile.careerDirections,
            matchedInterests: params.profile.interests,
            fallbackCardCount: selection.selected.filter((item) => incrementalCardIds.has(item.card.id) && item.selectedLayer === "fallback").length
        }
    };
}
