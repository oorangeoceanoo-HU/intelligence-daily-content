"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const candidateGenerator_1 = require("../src/content/candidateGenerator");
const personalizedIssue_1 = require("../src/content/personalizedIssue");
const sampleCandidates_1 = require("../src/content/sampleCandidates");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
const generatedAt = "2026-08-18T00:10:00.000Z";
const ukLocalCandidate = {
    ...sampleCandidates_1.sampleCandidateItems[4],
    id: "candidate-uk-local-policy",
    title: "英国发布影响伦敦居民与企业的新政策安排",
    oneLine: "英国政府公布新的公共服务与企业执行安排，伦敦用户需要留意生效日期。",
    categories: ["local", "policy", "world"],
    industries: ["generalPublic", "localLife", "technologyEngineering"],
    regions: ["英国"],
    locations: ["伦敦"],
    sourceIds: ["bbc-world-rss"],
    sourceLinks: [{
            title: "英国本地政策来源",
            url: "https://example.com/uk-local-policy",
            sourceId: "bbc-world-rss",
            publishedAt: "2026-08-18T00:00:00.000Z",
            language: "zh",
            translationStatus: "not-needed",
            verificationStatus: "confirmed"
        }],
    publishedAt: "2026-08-18T00:00:00.000Z",
    impactScore: 78,
    severityScore: 48,
    freshnessScore: 95
};
const profiles = [
    {
        id: "ai-user",
        profile: {
            phone: "ai-user",
            displayName: "AI 产品用户",
            phase: "产品经理",
            careerDirections: ["AI 与产品方向", "互联网产品 / 产品经理"],
            country: "中国",
            livingCity: "上海",
            hometownCity: "杭州",
            interests: ["AI 产品", "产品行业", "本地提醒"]
        }
    },
    {
        id: "teacher-user",
        profile: {
            phone: "teacher-user",
            displayName: "教师用户",
            phase: "初级职场人",
            careerDirections: ["教师 / 教育从业者"],
            country: "中国",
            livingCity: "南京",
            hometownCity: "苏州",
            interests: ["教育行业", "教育", "本地提醒"]
        }
    },
    {
        id: "uk-engineer-user",
        profile: {
            phone: "uk-engineer-user",
            displayName: "英国工程师用户",
            phase: "工程师 / 技术研发",
            careerDirections: ["技术研发 / 工程"],
            country: "英国",
            livingCity: "伦敦",
            hometownCity: "杭州",
            interests: ["AI 技术", "本地提醒"]
        }
    }
];
const broadProfile = {
    phone: "public",
    displayName: "公共质量检查",
    phase: "初级职场人",
    careerDirections: profiles.flatMap((item) => item.profile.careerDirections),
    country: "中国",
    livingCity: "上海",
    hometownCity: "杭州",
    interests: profiles.flatMap((item) => item.profile.interests)
};
const candidates = [...sampleCandidates_1.sampleCandidateItems, ukLocalCandidate];
const pool = candidates.map((candidate) => ({
    candidate,
    card: (0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(candidate, broadProfile), generatedAt)
}));
const results = new Map(profiles.map(({ id, profile }) => [
    id,
    (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
        userId: id,
        profile,
        preferences: {
            topicIntensity: Object.fromEntries(profile.interests.map((interest) => [interest, "重点"])),
            temporaryFocus: []
        },
        pool,
        date: "2026-08-18",
        edition: "morning",
        editionLabel: "晨间版",
        generatedAt,
        minimumCards: 4,
        comfortableMaxCards: 6,
        absoluteMaxCards: 7
    })
]));
const cardIdsFor = (id) => results.get(id)?.issue.cards.map((card) => card.id) ?? [];
const hasCandidate = (id, candidateId) => cardIdsFor(id).includes(`draft-${candidateId}`);
assert(hasCandidate("ai-user", "candidate-global-policy-energy"), "AI user lost the shared major event");
assert(hasCandidate("teacher-user", "candidate-global-policy-energy"), "Teacher user lost the shared major event");
assert(hasCandidate("uk-engineer-user", "candidate-global-policy-energy"), "UK user lost the shared major event");
assert(hasCandidate("ai-user", "candidate-ai-model-release"), "AI user did not receive the AI product item");
assert(hasCandidate("teacher-user", "candidate-education-ai-guideline"), "Teacher user did not receive the education item");
assert(hasCandidate("uk-engineer-user", "candidate-uk-local-policy"), "UK user did not receive the London item");
assert((results.get("uk-engineer-user")?.summary.layerCounts.local ?? 0) >= 1, "UK user's London item was not counted in the local layer");
const selectedFingerprints = profiles.map(({ id }) => cardIdsFor(id).join("|"));
assert(new Set(selectedFingerprints).size === profiles.length, "Different profiles produced identical issues");
profiles.forEach(({ id }) => {
    const result = results.get(id);
    assert(result?.issue.userId === id, `${id} issue was assigned to another account`);
    assert((result?.issue.cards.length ?? 0) >= 4, `${id} issue fell below the test minimum`);
});
const feedbackResult = (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
    userId: "ai-feedback-user",
    profile: profiles[0].profile,
    preferences: {
        topicIntensity: {},
        temporaryFocus: [],
        contentFeedback: {
            "candidate-ai-model-release": {
                action: "not_interested",
                title: "主流 AI 公司发布多模态模型能力更新"
            }
        }
    },
    pool,
    date: "2026-08-18",
    edition: "morning",
    editionLabel: "晨间版",
    generatedAt,
    minimumCards: 4,
    comfortableMaxCards: 6,
    absoluteMaxCards: 7
});
assert(!feedbackResult.issue.cards.some((card) => card.id === "draft-candidate-ai-model-release"), "Not-interested feedback did not remove a matching non-critical item");
const concentratedPool = Array.from({ length: 30 }, (_, index) => {
    const base = sampleCandidates_1.sampleCandidateItems[index % sampleCandidates_1.sampleCandidateItems.length];
    const sourceId = index < 20 ? "dominant-source" : `alternate-source-${index}`;
    const candidate = {
        ...base,
        id: `candidate-diversity-${index}`,
        title: `Personalization diversity candidate ${index}`,
        oneLine: `Candidate ${index} verifies minimum issue sizing after source diversity limits.`,
        sourceIds: [sourceId],
        sourceLinks: [{
                ...base.sourceLinks[0],
                title: `Source ${index}`,
                url: `https://example.com/personalization-diversity-${index}`,
                sourceId,
                publishedAt: generatedAt
            }],
        impactScore: index < 20 ? 92 : 48,
        severityScore: index < 20 ? 88 : 36,
        freshnessScore: 95
    };
    return {
        candidate,
        card: (0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(candidate, broadProfile), generatedAt)
    };
});
const diversityResult = (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
    userId: "diversity-user",
    profile: broadProfile,
    pool: concentratedPool,
    date: "2026-08-18",
    edition: "morning",
    editionLabel: "Morning",
    generatedAt,
    minimumCards: 15,
    comfortableMaxCards: 20,
    absoluteMaxCards: 24
});
assert(diversityResult.issue.cards.length >= 15, "Source diversity limits reduced a personalized issue below 15 cards");
assert(diversityResult.issue.pageCount === 3, "A complete personalized issue did not keep three pages");
assert((0, personalizedIssue_1.isCompletePersonalizedIssue)(diversityResult.issue), "A 15-card, three-page personalized issue should be publishable");
const incompleteResult = (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
    userId: "new-midday-user",
    profile: broadProfile,
    pool: pool.slice(0, 5),
    date: "2026-08-18",
    edition: "midday",
    editionLabel: "Midday",
    generatedAt
});
assert(!(0, personalizedIssue_1.isCompletePersonalizedIssue)(incompleteResult.issue), "A new account must not receive an incomplete incremental issue");
console.log(JSON.stringify({
    verifiedProfiles: profiles.map(({ id }) => ({
        id,
        cards: cardIdsFor(id),
        layers: results.get(id)?.summary.layerCounts
    })),
    diversityRegression: {
        cards: diversityResult.issue.cards.length,
        pageCount: diversityResult.issue.pageCount
    },
    feedbackRegression: feedbackResult.issue.cards.map((card) => card.id)
}, null, 2));
