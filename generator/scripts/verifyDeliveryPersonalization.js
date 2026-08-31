"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dailyIssuePayload_1 = require("../src/data/dailyIssuePayload");
const personalizedIssue_1 = require("../src/content/personalizedIssue");
const candidateGenerator_1 = require("../src/content/candidateGenerator");
const sampleCandidates_1 = require("../src/content/sampleCandidates");
const expect = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
const expectEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
    }
};
const expectNotEqual = (actual, expected, message) => {
    if (actual === expected) {
        throw new Error(`${message}: received the same value`);
    }
};
const generatedAt = "2026-08-25T00:10:00.000Z";
const date = "2026-08-25";
const profiles = {
    aiProductUser: {
        phone: "ai-product-user",
        displayName: "AI 产品用户",
        phase: "产品经理",
        careerDirections: ["AI 与产品方向", "互联网产品 / 产品经理"],
        country: "中国",
        livingCity: "上海",
        hometownCountry: "中国",
        hometownCity: "杭州",
        interests: ["AI 产品", "AI 技术", "产品行业"]
    },
    teacherUser: {
        phone: "teacher-user",
        displayName: "教育用户",
        phase: "初级职场人",
        careerDirections: ["教师 / 教育从业者"],
        country: "中国",
        livingCity: "南京",
        hometownCountry: "中国",
        hometownCity: "苏州",
        interests: ["教育行业", "教育"]
    },
    ukEngineerUser: {
        phone: "uk-engineer-user",
        displayName: "英国工程师",
        phase: "工程师 / 技术研发",
        careerDirections: ["技术研发 / 工程"],
        country: "英国",
        livingCity: "伦敦",
        hometownCountry: "中国",
        hometownCity: "杭州",
        interests: ["AI 技术"]
    }
};
const cloneCandidate = (base, params) => ({
    ...base,
    ...params,
    oneLine: params.oneLine ?? `${params.title}，这是一条用于验证画像分发的行业候选信息。`,
    regions: params.regions ?? ["全球"],
    locations: params.locations ?? [],
    sourceIds: params.sourceIds ?? ["openai-news"],
    sourceLinks: params.sourceLinks ?? [{
            title: `${params.title}来源`,
            url: `https://example.com/${params.id}`,
            sourceId: (params.sourceIds ?? ["openai-news"])[0],
            publishedAt: generatedAt,
            language: "zh",
            translationStatus: "not-needed",
            verificationStatus: "confirmed"
        }],
    publishedAt: params.publishedAt ?? generatedAt,
    impactScore: params.impactScore ?? 76,
    severityScore: params.severityScore ?? 42,
    freshnessScore: params.freshnessScore ?? 96,
    trendScore: params.trendScore ?? 70,
    isExample: false
});
const base = sampleCandidates_1.sampleCandidateItems.find((item) => item.id === "candidate-ai-model-release");
const publicCandidate = sampleCandidates_1.sampleCandidateItems.find((item) => item.id === "candidate-global-policy-energy");
const genericPublicCandidate = {
    ...publicCandidate,
    id: "candidate-generic-public-trade",
    title: "美国贸易政策变化及全球市场影响",
    oneLine: "一条公共贸易政策信息，用于验证不能因为泛运营标签进入 AI 产品用户的行业版。",
    categories: ["world", "policy", "finance", "operations"],
    industries: ["generalPublic", "financeInvestment", "operationsGrowth", "ecommerceRetail"],
    regions: ["全球"],
    locations: ["美国"],
    sourceIds: ["openai-news"],
    sourceLinks: [{
            title: "公共贸易政策来源",
            url: "https://example.com/generic-public-trade",
            sourceId: "openai-news",
            publishedAt: generatedAt,
            language: "zh",
            translationStatus: "not-needed",
            verificationStatus: "confirmed"
        }],
    publishedAt: generatedAt,
    impactScore: 86,
    severityScore: 60,
    freshnessScore: 96
};
const publicCard = (0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(publicCandidate, profiles.aiProductUser), generatedAt);
const educationBase = sampleCandidates_1.sampleCandidateItems.find((item) => item.id === "candidate-education-ai-guideline");
const aiCandidates = Array.from({ length: 15 }, (_, index) => cloneCandidate(base, {
    id: `candidate-ai-industry-${index + 1}`,
    title: `AI 产品与智能体行业更新 ${index + 1}`,
    categories: ["ai", "product", "technology"],
    industries: ["aiProduct", "aiTechnology", "productManagement", "technologyEngineering"],
    sourceIds: [["openai-news", "techcrunch-ai-rss", "theverge-ai-rss", "xinhua-tech", "ieee-spectrum-rss"][index % 5]],
    sourceLinks: [{
            title: `AI 行业独立来源 ${index + 1}`,
            url: `https://example.com/ai-industry-${index + 1}`,
            sourceId: ["openai-news", "techcrunch-ai-rss", "theverge-ai-rss", "xinhua-tech", "ieee-spectrum-rss"][index % 5],
            publishedAt: generatedAt
        }]
}));
const educationCandidates = Array.from({ length: 15 }, (_, index) => cloneCandidate(educationBase, {
    id: `candidate-education-industry-${index + 1}`,
    title: `教育与课堂 AI 应用动态 ${index + 1}`,
    categories: ["education", "policy", "ai"],
    industries: ["teacher", "educationResearch", "aiTechnology"],
    regions: ["中国"],
    sourceIds: [["moe-cn", "eol-education", "jyb-education", "cas-science-news"][index % 4]]
}));
const ukCandidates = Array.from({ length: 15 }, (_, index) => cloneCandidate(base, {
    id: `candidate-uk-engineering-${index + 1}`,
    title: `英国工程与 AI 研发动态 ${index + 1}`,
    categories: ["technology", "ai"],
    industries: ["technologyEngineering", "aiTechnology"],
    regions: ["英国"],
    locations: ["伦敦"],
    sourceIds: [["xinhua-tech", "techcrunch-ai-rss", "openai-news", "ieee-spectrum-rss", "cas-science-news"][index % 5]]
}));
const candidates = [publicCandidate, genericPublicCandidate, ...aiCandidates, ...educationCandidates, ...ukCandidates];
const broadProfile = profiles.aiProductUser;
const pool = candidates.map((candidate) => ({
    candidate,
    card: (0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(candidate, broadProfile), generatedAt)
}));
const issues = Object.entries(profiles).map(([key, profile]) => [
    key,
    (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
        userId: key,
        profile,
        preferences: {
            topicIntensity: Object.fromEntries(profile.interests.map((interest) => [interest, "重点"])),
            temporaryFocus: []
        },
        pool,
        date,
        edition: "morning",
        editionLabel: "晨间版",
        generatedAt,
        minimumCards: 15,
        comfortableMaxCards: 18,
        absoluteMaxCards: 20
    })
]);
const resultMap = new Map(issues);
const cardIds = (key) => resultMap.get(key)?.issue.cards.map((card) => card.id) ?? [];
const hasCard = (key, id) => cardIds(key).includes(`draft-${id}`);
for (const key of Object.keys(profiles)) {
    const result = resultMap.get(key);
    expectEqual(result.issue.pageCount, 3, `${key} should receive three pages`);
    expect(result.issue.cards.length >= 15, `${key} should receive at least 15 cards`);
    expect((0, personalizedIssue_1.isPersonalizedPageLayoutValid)(result.issue), `${key} must keep explicit public/industry page boundaries`);
    expect(result.issue.cards.filter((card) => card.personalizationPage === 1).length <= 8, `${key} public news must stay within the first-page cap`);
    expect(result.issue.cards
        .filter((card) => card.personalizationPage === 2 || card.personalizationPage === 3)
        .every((card) => card.personalizationLayer === "personalized"), `${key} industry pages must not contain public news`);
    expect(result.issue.cards
        .filter((card) => card.personalizationPage === 2 || card.personalizationPage === 3)
        .every((card) => !["front", "world", "china", "risk"].includes(card.section)), `${key} industry pages must not contain public sections`);
    expect(result.issue.cards.filter((card) => card.personalizationPage === 1).length > 0, `${key} must retain one public-news page`);
    expectEqual(result.summary.layerCounts.shared + result.summary.layerCounts.professional, result.issue.cards.length, `${key} main layer counts must cover every published card`);
}
const stalePublicCard = {
    ...resultMap.get("aiProductUser").issue.cards.find((card) => card.personalizationPage === 1),
    personalizationLayer: "personalized",
    personalizationPage: 2,
    section: "world"
};
const stalePublicIssue = {
    ...resultMap.get("aiProductUser").issue,
    cards: [stalePublicCard, ...resultMap.get("aiProductUser").issue.cards.slice(1)]
};
expect(!(0, personalizedIssue_1.isPersonalizedPageLayoutValid)(stalePublicIssue), "a stale backend card marked personalized must not pass the public/industry layout gate");
expect(hasCard("aiProductUser", "candidate-ai-industry-1"), "AI profile missed AI industry content");
expect(hasCard("teacherUser", "candidate-education-industry-1"), "Teacher profile missed education content");
expect(hasCard("ukEngineerUser", "candidate-uk-engineering-1"), "UK engineer profile missed local industry content");
expect((resultMap.get("ukEngineerUser")?.summary.layerCounts.local ?? 0) >= 1, "UK engineer profile missed country or city layer");
expectNotEqual(new Set(Object.keys(profiles).map((key) => cardIds(key).join("|"))).size, 1, "Different profiles must not receive one identical issue");
const noisyCard = {
    ...publicCard,
    id: "draft-cookie-noise",
    title: "Cookie Settings",
    body: {
        ...publicCard.body,
        keyProgress: "Manage my choices"
    }
};
const cleanCard = (0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(aiCandidates[0], profiles.aiProductUser), generatedAt);
const payload = {
    ...resultMap.get("aiProductUser").issue,
    cards: [noisyCard, cleanCard],
    pageCount: 1,
    topCardId: noisyCard.id,
    editionCardIds: [noisyCard.id, cleanCard.id],
    carriedCardIds: []
};
const parsed = (0, dailyIssuePayload_1.parseDailyIssuePayload)({ issue: payload });
expectEqual(parsed?.issue.cards.length, 1, "web consent noise must be removed at the reading boundary");
expectEqual(parsed?.issue.cards[0]?.id, cleanCard.id, "clean reporting card must survive noise filtering");
expectEqual(parsed?.issue.topCardId, cleanCard.id, "top card metadata must be repaired after filtering");
console.log(JSON.stringify({
    verifiedProfiles: issues.map(([key, result]) => ({
        key,
        cards: result.issue.cards.length,
        pageCount: result.issue.pageCount,
        layerCounts: result.summary.layerCounts
    })),
    aiSourceCount: new Set(aiCandidates.flatMap((candidate) => candidate.sourceIds)).size,
    noiseFiltering: parsed?.issue.cards.map((card) => card.id)
}, null, 2));
