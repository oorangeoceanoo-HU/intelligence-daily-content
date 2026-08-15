"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserContentPlan = buildUserContentPlan;
exports.getLaneSourceNames = getLaneSourceNames;
const sourceRegistry_1 = require("./sourceRegistry");
const profileMapping_1 = require("./profileMapping");
const laneBlueprints = [
    {
        id: "mustKnow",
        label: "必须知道",
        priority: 100,
        categories: ["world", "china", "policy", "publicSafety"],
        industries: ["generalPublic"],
        reason: "保证所有用户都能看到重大国际、国内政策和公共事件。"
    },
    {
        id: "risk",
        label: "风险提醒",
        priority: 90,
        categories: ["disaster", "publicSafety", "local"],
        industries: ["generalPublic", "localLife"],
        reason: "覆盖灾害、天气、公共安全和本地提醒。"
    },
    {
        id: "industry",
        label: "行业重点",
        priority: 80,
        categories: ["ai", "product", "technology", "education", "hr", "operations", "finance", "healthcare", "ecommerce"],
        industries: [],
        reason: "根据用户职业和关注标签选择行业信息。"
    },
    {
        id: "local",
        label: "城市相关",
        priority: 70,
        categories: ["local", "policy", "publicSafety"],
        industries: ["localLife", "generalPublic"],
        reason: "把居住城市和家乡城市相关信息纳入筛选。"
    },
    {
        id: "light",
        label: "轻阅读",
        priority: 40,
        categories: ["lightTrend", "creator", "consumer"],
        industries: ["contentCreator", "gamesEntertainment", "consumerBrand"],
        reason: "只低权重纳入热点素材和大众文化信息。"
    }
];
const unique = (items) => Array.from(new Set(items));
const intersects = (a, b) => a.some((item) => b.includes(item));
const sourceMatchesRegion = (source, profile) => source.regions.includes("全球") ||
    source.regions.includes(profile.country) ||
    source.regions.includes(profile.livingCity) ||
    source.regions.includes(profile.hometownCity);
const sourceMatchesLane = (source, lane, userCategories, userIndustries, profile) => {
    if (!source.enabled || !sourceMatchesRegion(source, profile)) {
        return false;
    }
    if (lane.id === "industry") {
        return (intersects(source.categories, userCategories) ||
            intersects(source.industries, userIndustries));
    }
    return (intersects(source.categories, lane.categories) ||
        intersects(source.industries, lane.industries));
};
const sourceRank = (source) => {
    const tierScore = { T0: 400, T1: 300, T2: 200, T3: 100 }[source.tier];
    const accessPenalty = source.requiresApiKey ? 30 : 0;
    return tierScore + source.trustScore * 10 - accessPenalty;
};
const sourceIdsForLane = (lane, userCategories, userIndustries, profile) => sourceRegistry_1.sourceRegistry
    .filter((source) => sourceMatchesLane(source, lane, userCategories, userIndustries, profile))
    .sort((a, b) => sourceRank(b) - sourceRank(a))
    .map((source) => source.id);
const countSourcesBy = (sourceIds, predicate) => sourceRegistry_1.sourceRegistry.filter((source) => sourceIds.includes(source.id) && predicate(source)).length;
function buildUserContentPlan(profile) {
    const industries = (0, profileMapping_1.deriveIndustryTags)(profile);
    const categories = (0, profileMapping_1.deriveContentCategories)(profile);
    const lanes = laneBlueprints.map((lane) => ({
        ...lane,
        industries: lane.id === "industry" ? industries : lane.industries,
        categories: lane.id === "industry" ? categories : lane.categories,
        sourceIds: sourceIdsForLane(lane, categories, industries, profile)
    }));
    const sourceIds = unique(lanes.flatMap((lane) => lane.sourceIds));
    return {
        profileKey: (0, profileMapping_1.createProfileKey)(profile),
        country: profile.country,
        cities: unique([profile.livingCity, profile.hometownCity]),
        industries,
        categories,
        sourceIds,
        lanes,
        sourceMix: {
            official: countSourcesBy(sourceIds, (source) => source.tier === "T0"),
            mainstream: countSourcesBy(sourceIds, (source) => source.tier === "T1"),
            industry: countSourcesBy(sourceIds, (source) => source.tier === "T2"),
            light: countSourcesBy(sourceIds, (source) => source.tier === "T3")
        },
        notes: [
            "所有用户默认保留重大国际、国内政策、灾害和公共安全信息。",
            "行业信息由当前阶段、职业方向和关注标签共同决定。",
            "需要 API key 或授权确认的来源先登记但默认关闭，避免第一版依赖不稳定来源。"
        ]
    };
}
function getLaneSourceNames(plan, laneId) {
    const lane = plan.lanes.find((item) => item.id === laneId);
    if (!lane) {
        return [];
    }
    return lane.sourceIds
        .map((sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.name)
        .filter((name) => Boolean(name));
}
