"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankCandidateForProfile = rankCandidateForProfile;
exports.rankedCandidateToCard = rankedCandidateToCard;
exports.buildCandidateIssuePreview = buildCandidateIssuePreview;
const contentPlanner_1 = require("./contentPlanner");
const sampleCandidates_1 = require("./sampleCandidates");
const sourceRegistry_1 = require("./sourceRegistry");
const unique = (items) => Array.from(new Set(items));
const intersects = (a, b) => a.some((item) => b.includes(item));
const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));
const specificIndustryTags = (tags) => tags.filter((tag) => tag !== "generalPublic" && tag !== "localLife");
const findSource = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId);
const candidateSources = (candidate) => candidate.sourceIds.map(findSource).filter((source) => Boolean(source));
const candidateMatchesLane = (candidate, lane, plan) => {
    const isSpecializedIndustry = intersects(candidate.categories, [
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
        "design",
        "startup",
        "lightTrend"
    ]);
    if (lane.id === "mustKnow") {
        return (candidate.impactScore >= 85 ||
            candidate.severityScore >= 80 ||
            (intersects(candidate.categories, ["world", "china", "policy"]) &&
                candidate.impactScore >= 75 &&
                !isSpecializedIndustry));
    }
    if (lane.id === "risk") {
        return ((intersects(candidate.categories, ["disaster", "publicSafety"]) &&
            (candidate.severityScore >= 55 ||
                candidate.impactScore >= 70 ||
                intersects(candidate.locations, plan.cities))) ||
            candidate.severityScore >= 88);
    }
    if (lane.id === "local") {
        return intersects(candidate.locations, plan.cities);
    }
    if (lane.id === "industry") {
        return (intersects(candidate.categories.filter((category) => !["world", "china", "local", "policy", "disaster", "publicSafety"].includes(category)), plan.categories) ||
            intersects(specificIndustryTags(candidate.industries), specificIndustryTags(plan.industries)));
    }
    if (lane.id === "light") {
        return intersects(candidate.categories, ["lightTrend", "creator"]);
    }
    return (intersects(candidate.categories, lane.categories) ||
        intersects(candidate.industries, lane.industries));
};
const getMatchedLaneIds = (candidate, plan) => plan.lanes
    .filter((lane) => candidateMatchesLane(candidate, lane, plan))
    .map((lane) => lane.id);
const scoreRelevance = (candidate, profile, plan) => {
    const reasons = [];
    const matchedCountries = [profile.country, profile.hometownCountry]
        .filter((country) => country && candidate.regions.includes(country));
    const exactCountry = matchedCountries.length > 0;
    const globalRelevant = candidate.regions.includes("全球");
    const cityHits = candidate.locations.filter((location) => plan.cities.includes(location));
    const specificIndustryHits = specificIndustryTags(candidate.industries).filter((industry) => plan.industries.includes(industry));
    const generalIndustryHit = candidate.industries.includes("generalPublic");
    const publicRiskHit = candidate.categories.includes("disaster") || candidate.categories.includes("publicSafety");
    const lightTrendHit = candidate.categories.includes("lightTrend");
    const userWantsLight = plan.industries.includes("contentCreator") ||
        plan.industries.includes("operationsGrowth") ||
        plan.industries.includes("consumerBrand");
    const country = exactCountry ? 25 : globalRelevant ? 18 : 0;
    const city = cityHits.length > 0 ? 20 : 0;
    const industry = specificIndustryHits.length > 0 ? Math.min(25, 10 + specificIndustryHits.length * 6) : generalIndustryHit ? 8 : 0;
    const temporaryFocus = 0;
    const publicRisk = publicRiskHit ? 20 : 0;
    const userPreferencePenalty = lightTrendHit && !userWantsLight ? -18 : 0;
    if (exactCountry) {
        reasons.push(`命中关联国家：${matchedCountries.join("、")}`);
    }
    else if (globalRelevant) {
        reasons.push("属于全球性信息");
    }
    if (cityHits.length > 0) {
        reasons.push(`命中城市：${cityHits.join("、")}`);
    }
    if (specificIndustryHits.length > 0) {
        reasons.push(`命中行业标签：${specificIndustryHits.join("、")}`);
    }
    if (publicRiskHit) {
        reasons.push("属于风险提醒或公共安全信息");
    }
    if (userPreferencePenalty < 0) {
        reasons.push("轻阅读信息未命中当前偏好，降低权重");
    }
    return {
        total: clampScore(country + city + industry + temporaryFocus + publicRisk + userPreferencePenalty),
        country,
        city,
        industry,
        temporaryFocus,
        publicRisk,
        userPreferencePenalty,
        reasons
    };
};
const trustComponent = (candidate) => {
    const sources = candidateSources(candidate);
    if (!sources.length) {
        return 30;
    }
    const trustAverage = sources.reduce((sum, source) => sum + source.trustScore, 0) / sources.length;
    const multiSourceBonus = sources.length > 1 ? 8 : 0;
    return clampScore(trustAverage * 16 + multiSourceBonus);
};
const majorEventSignal = (candidate) => {
    const text = `${candidate.title} ${candidate.oneLine} ${candidate.body.keyProgress}`.toLowerCase();
    const isInternational = candidate.categories.includes("world");
    const systemicKeyword = /战争|冲突升级|停火破裂|霍尔木兹|海峡通航|关税|制裁|总统(?:辞职|下台|更迭)|政变|核设施|能源供应|航运中断|\bwar\b|\bconflict\b|ceasefire|strait of hormuz|tariff|sanction|coup|nuclear/u.test(text);
    const majorDisaster = candidate.categories.includes("disaster") &&
        (candidate.impactScore >= 85 || candidate.severityScore >= 82);
    return (isInternational && systemicKeyword && candidate.impactScore >= 80) || majorDisaster;
};
const levelFromScore = (score) => {
    if (score >= 82) {
        return "S";
    }
    if (score >= 68) {
        return "A";
    }
    if (score >= 52) {
        return "B";
    }
    return "C";
};
const scoreImportance = (candidate, relevanceScore) => {
    const sourceTrust = trustComponent(candidate);
    const baseTotal = clampScore(candidate.impactScore * 0.28 +
        candidate.severityScore * 0.18 +
        relevanceScore.total * 0.22 +
        sourceTrust * 0.16 +
        candidate.freshnessScore * 0.1 +
        candidate.trendScore * 0.06);
    const isMajorEvent = majorEventSignal(candidate);
    const total = isMajorEvent ? Math.max(84, baseTotal) : baseTotal;
    const reasons = [
        `影响范围分 ${candidate.impactScore}`,
        `事件严重性分 ${candidate.severityScore}`,
        `来源可信分 ${sourceTrust}`
    ];
    if (candidate.trendScore >= 75) {
        reasons.push("具备趋势观察价值");
    }
    if (isMajorEvent) {
        reasons.push("命中重大国际事件或重大灾害保底规则");
    }
    return {
        total,
        level: levelFromScore(total),
        impactScope: candidate.impactScore,
        severity: candidate.severityScore,
        userRelevance: relevanceScore.total,
        sourceTrust,
        freshness: candidate.freshnessScore,
        trendValue: candidate.trendScore,
        reasons
    };
};
const targetSectionForCandidate = (candidate, matchedLaneIds) => {
    if (matchedLaneIds.includes("risk")) {
        return "risk";
    }
    if (matchedLaneIds.includes("local")) {
        return "local";
    }
    if (candidate.categories.includes("lightTrend")) {
        return "light";
    }
    if (candidate.categories.includes("ai") &&
        !intersects(candidate.categories, ["education", "hr", "operations", "ecommerce", "consumer"])) {
        return "ai";
    }
    if (candidate.categories.includes("product")) {
        return "product";
    }
    if (matchedLaneIds.includes("light")) {
        return "light";
    }
    if (matchedLaneIds.includes("mustKnow")) {
        return "front";
    }
    return "industry";
};
const credibilityForCandidate = (candidate) => {
    const sources = candidateSources(candidate);
    const hasPendingOnly = candidate.sourceLinks.length > 0 &&
        candidate.sourceLinks.every((source) => source.verificationStatus === "pending");
    const hasGovernmentLink = candidate.sourceLinks.some((source) => /^https?:\/\/(?:[\w-]+\.)*gov\.cn(?:\/|$)/iu.test(source.url));
    if (hasPendingOnly) {
        return "待确认";
    }
    if (hasGovernmentLink) {
        return "官方来源";
    }
    if (sources.some((source) => source.tier === "T0") && sources.length === 1) {
        return "官方来源";
    }
    if (sources.length >= 2) {
        return "多源确认";
    }
    if (sources.some((source) => source.tier === "T1")) {
        return "主流媒体";
    }
    if (sources.some((source) => source.tier === "T2")) {
        return "行业观察";
    }
    return "待确认";
};
const lanePriorityBoost = (plan, matchedLaneIds) => {
    const priorities = plan.lanes
        .filter((lane) => matchedLaneIds.includes(lane.id))
        .map((lane) => lane.priority);
    return priorities.length ? Math.max(...priorities) * 0.08 : 0;
};
const selectedReason = (candidate, ranked) => {
    const laneText = ranked.matchedLaneIds.join(" / ") || "未命中板块";
    const firstReason = ranked.relevanceScore.reasons.find((reason) => reason.startsWith("命中城市")) ??
        ranked.relevanceScore.reasons.find((reason) => reason.startsWith("命中行业")) ??
        ranked.relevanceScore.reasons.find((reason) => reason.includes("风险")) ??
        ranked.relevanceScore.reasons[0] ??
        "候选信息具备基础公共价值";
    return `${laneText}：${firstReason}，综合分 ${ranked.finalScore}`;
};
function rankCandidateForProfile(candidate, profile, plan = (0, contentPlanner_1.buildUserContentPlan)(profile)) {
    const relevanceScore = scoreRelevance(candidate, profile, plan);
    const importanceScore = scoreImportance(candidate, relevanceScore);
    const matchedLaneIds = getMatchedLaneIds(candidate, plan);
    const targetSection = targetSectionForCandidate(candidate, matchedLaneIds);
    const finalScore = clampScore(importanceScore.total * 0.62 + relevanceScore.total * 0.3 + lanePriorityBoost(plan, matchedLaneIds));
    const baseRanked = {
        candidate,
        relevanceScore,
        importanceScore,
        matchedLaneIds,
        targetSection,
        finalScore
    };
    return {
        ...baseRanked,
        selectedReason: selectedReason(candidate, baseRanked)
    };
}
function rankedCandidateToCard(ranked, generatedAt) {
    const { candidate, importanceScore } = ranked;
    return {
        id: `draft-${candidate.id}`,
        title: candidate.title,
        oneLine: candidate.oneLine,
        importance: importanceScore.level,
        credibility: credibilityForCandidate(candidate),
        tags: unique([
            importanceScore.level,
            ...ranked.matchedLaneIds,
            ...candidate.categories.slice(0, 3)
        ]),
        industries: candidate.industries,
        section: ranked.targetSection,
        body: candidate.body,
        sourceLinks: candidate.sourceLinks,
        images: candidate.images,
        generatedAt
    };
}
function buildCandidateIssuePreview(profileName, profile, candidates = sampleCandidates_1.sampleCandidateItems, limit = 8) {
    const plan = (0, contentPlanner_1.buildUserContentPlan)(profile);
    const generatedAt = new Date().toISOString();
    const rankedCandidates = candidates
        .map((candidate) => rankCandidateForProfile(candidate, profile, plan))
        .sort((a, b) => b.finalScore - a.finalScore);
    const selectedCandidates = rankedCandidates
        .filter((ranked) => ranked.importanceScore.level === "S" ||
        (ranked.matchedLaneIds.length > 0 && ranked.finalScore >= 40))
        .slice(0, limit);
    return {
        id: `candidate-preview-${profileName}`,
        profileName,
        plan,
        rankedCandidates,
        selectedCandidates,
        selectedCards: selectedCandidates.map((candidate) => rankedCandidateToCard(candidate, generatedAt)),
        generatedAt
    };
}
