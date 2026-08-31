"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessProfileCoverage = exports.sourceRoleFor = exports.assessSourceCoverage = void 0;
const editionFreshness_1 = require("./editionFreshness");
const sourceRegistry_1 = require("./sourceRegistry");
const profileMapping_1 = require("./profileMapping");
const baseLaneRules = [
    {
        id: "global",
        label: "国际重大新闻",
        required: true,
        minimumSuccessfulSources: 2,
        minimumCurrentSources: 2,
        currentInputRequired: true,
        sourceIds: ["xinhua-world", "npr-world-rss", "sky-world-rss", "france24-middle-east-rss", "france24-asia-pacific-rss", "cnbc-world-rss", "un-news-rss", "gdelt-doc-api"],
        note: "至少两个国际来源有内容，避免把单一媒体首页当成全球事件全集。"
    },
    {
        id: "chinaImpact",
        label: "中国关联与贸易政策",
        required: true,
        minimumSuccessfulSources: 2,
        minimumCurrentSources: 1,
        currentInputRequired: true,
        sourceIds: ["mfa-cn-news", "mofcom-trade", "gov-cn-policy-library", "xinhua-world", "france24-middle-east-rss", "france24-asia-pacific-rss", "cnbc-world-rss"],
        note: "同时观察中国官方入口和国际商业新闻，覆盖关税、外贸、能源、航运与外交影响。"
    },
    {
        id: "disaster",
        label: "国内外重大灾害",
        required: true,
        minimumSuccessfulSources: 2,
        minimumCurrentSources: 1,
        currentInputRequired: true,
        sourceIds: ["mem-cn", "gdacs-feed", "un-news-rss", "xinhua-world"],
        note: "国内应急来源与全球灾害来源至少各保持可用的交叉覆盖。"
    },
    {
        id: "industry",
        label: "行业与 AI 产品",
        required: true,
        minimumSuccessfulSources: 3,
        minimumCurrentSources: 1,
        currentInputRequired: false,
        sourceIds: [
            "xinhua-tech",
            "bbc-technology-rss",
            "openai-news",
            "deepmind-blog",
            "techcrunch-ai-rss",
            "theverge-ai-rss",
            "arxiv-cs-api",
            "cas-science-news",
            "moe-cn",
            "eol-education",
            "jyb-education",
            "mohrss-cn",
            "chrm-mohrss",
            "stats-cn-data",
            "mohurd-construction"
        ],
        note: "当前公共版覆盖多个行业；正式个性化版本仍需按用户画像选择对应来源组合。"
    },
    {
        id: "local",
        label: "居住城市与家乡城市",
        required: false,
        minimumSuccessfulSources: 1,
        minimumCurrentSources: 1,
        currentInputRequired: false,
        sourceIds: [],
        note: "当前共享日报没有按账号动态抓取城市政府和本地权威来源，此项仍是明确缺口。"
    }
];
const assessSourceCoverage = (results, options = {}) => {
    const currentWindowChecked = Boolean(options.issueDate && options.edition);
    const localRequired = Boolean(options.requireLocalSources && options.localSourceIds?.length);
    const localLabel = options.localCities?.length
        ? `居住城市与家乡城市：${options.localCities.join("、")}`
        : "居住城市与家乡城市";
    const laneRules = [
        ...baseLaneRules.slice(0, 4),
        {
            ...baseLaneRules[4],
            label: localLabel,
            required: localRequired,
            sourceIds: options.localSourceIds ?? [],
            note: localRequired
                ? "城市专属日报必须有对应城市来源；发现线索仍需回到当地官方或主流来源确认。"
                : options.localSourceIds?.length
                    ? "公共共享日报会监测示例城市，但城市无新增不能阻止其他核心内容出版；发现线索仍需官方或主流来源确认。"
                    : "当前版本没有按账号动态加载城市新闻源，此项不能被视为已完成覆盖。"
        }
    ];
    const resultById = new Map(results.map((result) => [result.sourceId, result]));
    const lanes = laneRules.map((rule) => {
        const laneResults = rule.sourceIds
            .map((sourceId) => resultById.get(sourceId))
            .filter((result) => Boolean(result));
        const successfulSourceIds = laneResults
            .filter((result) => result.ok && result.items.length > 0)
            .map((result) => result.sourceId);
        const failedSourceIds = laneResults
            .filter((result) => !result.ok)
            .map((result) => result.sourceId);
        const emptySourceIds = laneResults
            .filter((result) => result.ok && result.items.length === 0)
            .map((result) => result.sourceId);
        const currentItemsBySource = laneResults.map((result) => ({
            sourceId: result.sourceId,
            items: !currentWindowChecked || !options.issueDate || !options.edition
                ? []
                : result.items.filter((item) => (0, editionFreshness_1.assessEditionFreshness)(item, options.issueDate, options.edition, options.asOf).eligible)
        }));
        const currentSourceIds = currentItemsBySource
            .filter((entry) => entry.items.length > 0)
            .map((entry) => entry.sourceId);
        const currentItemCount = currentItemsBySource
            .reduce((sum, entry) => sum + entry.items.length, 0);
        const minimumCurrentSources = rule.id === "global" && currentWindowChecked && options.edition !== "morning"
            ? 1
            : rule.minimumCurrentSources;
        const currentReady = !currentWindowChecked || currentSourceIds.length >= minimumCurrentSources;
        return {
            id: rule.id,
            label: rule.label,
            required: rule.required,
            ready: successfulSourceIds.length >= rule.minimumSuccessfulSources,
            minimumSuccessfulSources: rule.minimumSuccessfulSources,
            successfulSourceIds,
            failedSourceIds,
            emptySourceIds,
            currentWindowChecked,
            minimumCurrentSources,
            currentInputRequired: rule.currentInputRequired,
            currentReady,
            currentSourceIds,
            currentItemCount,
            note: rule.note
        };
    });
    const successfulResults = results.filter((result) => result.ok);
    const resultsWithItems = successfulResults.filter((result) => result.items.length > 0);
    const sourceAvailabilityReady = lanes
        .filter((lane) => lane.required)
        .every((lane) => lane.ready);
    const currentCoverageReady = !currentWindowChecked || lanes
        .filter((lane) => lane.currentInputRequired)
        .every((lane) => lane.currentReady);
    return {
        ready: sourceAvailabilityReady && currentCoverageReady,
        sourceAvailabilityReady,
        currentCoverageReady,
        generatedAt: new Date().toISOString(),
        totalSources: results.length,
        successfulSources: successfulResults.length,
        sourcesWithItems: resultsWithItems.length,
        totalItems: results.reduce((sum, result) => sum + result.items.length, 0),
        lanes
    };
};
exports.assessSourceCoverage = assessSourceCoverage;
const sourceRoleFor = (sourceId) => sourceId.startsWith("city-news-rss:")
    ? "discovery"
    : sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.role ?? "both";
exports.sourceRoleFor = sourceRoleFor;
const specializedCategories = new Set([
    "ai", "product", "technology", "education", "hr", "operations", "finance",
    "healthcare", "ecommerce", "consumer", "creator", "startup", "design", "lightTrend"
]);
const publicCategories = new Set([
    "world", "china", "local", "policy", "disaster", "publicSafety"
]);
const unique = (items) => Array.from(new Set(items));
const assessProfileCoverage = (candidates, labels, options = {}) => {
    const minimumCandidates = options.minimumCandidates ?? 20;
    const minimumSources = options.minimumSources ?? 3;
    const minimumQualifiedCards = options.minimumQualifiedCards ?? 10;
    return unique(labels).map((label) => {
        const categories = (0, profileMapping_1.deriveTopicCategories)(label)
            .filter((category) => specializedCategories.has(category));
        const industries = (0, profileMapping_1.deriveTopicIndustryTags)(label)
            .filter((industry) => industry !== "generalPublic" && industry !== "localLife");
        const focusedSources = profileMapping_1.focusedSourceRequirements[label];
        const matched = categories.length || industries.length
            ? candidates.filter((candidate) => {
                const candidateCategories = candidate.categories ?? [];
                const candidateIndustries = (candidate.industries ?? [])
                    .filter((industry) => industry !== "generalPublic" && industry !== "localLife");
                const sourceIds = unique([
                    ...(candidate.sourceIds ?? []),
                    ...(candidate.sourceLinks ?? [])
                        .map((source) => source.sourceId)
                        .filter((sourceId) => Boolean(sourceId))
                ]);
                if (focusedSources?.length && !sourceIds.some((sourceId) => focusedSources.includes(sourceId))) {
                    return false;
                }
                const hasDomainCategory = candidateCategories.some((category) => specializedCategories.has(category));
                const hasDomainMatch = candidateCategories.some((category) => categories.includes(category)) ||
                    candidateIndustries.some((industry) => industries.includes(industry));
                return hasDomainMatch &&
                    (!candidateCategories.some((category) => publicCategories.has(category)) || hasDomainCategory);
            })
            : [];
        const matchedSourceIds = unique(matched.flatMap((candidate) => [
            ...(candidate.sourceIds ?? []),
            ...(candidate.sourceLinks ?? [])
                .map((source) => source.sourceId)
                .filter((sourceId) => Boolean(sourceId))
        ]));
        // A candidate may carry several provenance links after confirmation. The
        // coverage gate must count only the sources explicitly assigned to this
        // label; otherwise a public-news source can falsely satisfy an industry
        // label's three-source requirement.
        const sourceIds = focusedSources?.length
            ? matchedSourceIds.filter((sourceId) => focusedSources.includes(sourceId))
            : matchedSourceIds;
        const qualifiedCandidateCount = matched.length;
        const ready = Boolean(categories.length || industries.length) &&
            qualifiedCandidateCount >= minimumCandidates &&
            sourceIds.length >= minimumSources;
        return {
            label,
            categories,
            industries,
            sourceIds,
            candidateCount: candidates.length,
            qualifiedCandidateCount,
            qualifiedSourceCount: sourceIds.length,
            minimumCandidates,
            minimumSources,
            minimumQualifiedCards,
            ready,
            status: !categories.length && !industries.length
                ? "not-applicable"
                : ready ? "ready" : qualifiedCandidateCount === 0 ? "no-current-input" : "insufficient-input",
            note: ready
                ? "候选数量和来源数量达到日报个性化门槛。"
                : "不满足门槛时不得用其他行业内容补位；应发布同标签精简版或标记素材不足。"
        };
    });
};
exports.assessProfileCoverage = assessProfileCoverage;
