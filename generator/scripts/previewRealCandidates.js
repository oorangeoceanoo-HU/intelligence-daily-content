"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const candidateGenerator_1 = require("../src/content/candidateGenerator");
const candidatePreviewProfiles_1 = require("../src/content/candidatePreviewProfiles");
const candidateDeduper_1 = require("../src/content/candidateDeduper");
const rawFetchers_1 = require("../src/content/rawFetchers");
const rawToCandidate_1 = require("../src/content/rawToCandidate");
const stableSources = [
    "gov-cn-policy-library",
    "mem-cn",
    "cac-cn",
    "xinhua-world",
    "xinhua-tech",
    "france24-middle-east-rss",
    "france24-asia-pacific-rss",
    "moe-cn",
    "mohrss-cn",
    "hr-dive-rss",
    "hiring-lab-rss",
    "chrm-mohrss",
    "stats-cn-data",
    "mofcom-consumption"
];
const allSources = [
    "arxiv-cs-api",
    "gdacs-feed",
    "gov-cn-policy-library",
    "mem-cn",
    "cac-cn",
    "xinhua-world",
    "xinhua-tech",
    "moe-cn",
    "mohrss-cn",
    "chrm-mohrss",
    "stats-cn-data",
    "mofcom-consumption",
    "stats-cn-rss",
    "mofcom-cn",
    "nhc-cn",
    "meta-newsroom-rss",
    "buffer-resources-rss",
    "designboom-rss",
    "dezeen-rss",
    "smashing-magazine-rss",
    "uxdesign-cc-rss",
    "creativebloq-rss",
    "who-health-rss",
    "cdc-health-rss",
    "sciencedaily-health-rss",
    "gameindustry-rss",
    "gamespot-rss",
    "variety-rss",
    "techcrunch-startups-rss",
    "yc-blog-rss",
    "sec-press-rss",
    "federal-reserve-rss",
    "pbc-news",
    "ietf-blog-rss",
    "internet-society-rss",
    "ieee-spectrum-rss",
    "cloudflare-blog-rss",
    "retail-dive-rss",
    "ecommercebytes-rss",
    "adweek-rss",
    "nature-health-rss",
    "techcrunch-ai-rss",
    "theverge-ai-rss",
    "gdelt-doc-api",
    "reliefweb-api"
];
const shortSourceNames = {
    "arxiv-cs-api": "arxiv",
    "cas-science-news": "cas",
    "mohurd-construction": "construction",
    "gdacs-feed": "gdacs",
    "gov-cn-policy-library": "gov",
    "mem-cn": "mem",
    "cac-cn": "cac",
    "xinhua-world": "xinhua-world",
    "xinhua-tech": "xinhua-tech",
    "france24-middle-east-rss": "france24-middle-east",
    "france24-asia-pacific-rss": "france24-asia",
    "moe-cn": "moe",
    "mohrss-cn": "mohrss",
    "chrm-mohrss": "chrm",
    "stats-cn-data": "stats",
    "mofcom-consumption": "mofcom",
    "techcrunch-ai-rss": "techcrunch-ai",
    "theverge-ai-rss": "theverge-ai",
    "gdelt-doc-api": "gdelt",
    "reliefweb-api": "reliefweb"
};
const categoryLabels = {
    world: "国际",
    china: "中国",
    local: "本地",
    policy: "政策",
    disaster: "灾害",
    publicSafety: "公共安全",
    ai: "AI",
    product: "产品",
    technology: "技术",
    education: "教育",
    hr: "HR",
    operations: "运营",
    finance: "金融",
    healthcare: "医疗",
    ecommerce: "电商",
    consumer: "消费",
    creator: "内容创作",
    design: "设计",
    startup: "创业",
    lightTrend: "轻阅读"
};
const industryLabels = {
    aiProduct: "AI 产品",
    productManagement: "产品管理",
    aiTechnology: "AI 技术",
    technologyEngineering: "技术研发",
    educationResearch: "教育研究",
    communicationsResearch: "通信研究",
    architectureBuiltEnvironment: "建筑与城市",
    teacher: "教师",
    hrRecruiting: "HR / 招聘",
    operationsGrowth: "运营增长",
    contentCreator: "内容创作",
    financeInvestment: "金融投资",
    healthcare: "医疗健康",
    ecommerceRetail: "电商零售",
    consumerBrand: "消费品牌",
    designUx: "设计体验",
    startupBusiness: "创业商业",
    gamesEntertainment: "游戏文娱",
    localLife: "本地生活",
    generalPublic: "公共信息"
};
function parseArgs(argv) {
    const options = {
        sources: stableSources,
        limit: 3,
        json: false,
        help: false
    };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--help" || arg === "-h") {
            options.help = true;
            continue;
        }
        if (arg === "--json") {
            options.json = true;
            continue;
        }
        if (arg === "--all") {
            options.sources = allSources;
            continue;
        }
        if (arg === "--profile" || arg === "-p") {
            options.profile = argv[index + 1];
            index += 1;
            continue;
        }
        if (arg === "--source" || arg === "-s") {
            const rawSources = (argv[index + 1] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
            index += 1;
            if (rawSources.includes("all")) {
                options.sources = allSources;
            }
            else {
                const normalized = rawSources
                    .map(rawFetchers_1.normalizeRawFetchSourceId)
                    .filter((sourceId) => Boolean(sourceId));
                if (normalized.length) {
                    options.sources = normalized;
                }
            }
            continue;
        }
        if (arg === "--limit" || arg === "-l") {
            const parsed = Number(argv[index + 1]);
            options.limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10) : options.limit;
            index += 1;
        }
    }
    return options;
}
function printHelp() {
    console.log(`真实候选排序预览

这一步会：
  1. 从真实来源抓 RawContentItem
  2. 转成 CandidateContentItem
  3. 放进现有画像排序系统预览

用法：
  pnpm preview:real-candidates
  pnpm preview:real-candidates -- --profile "AI 产品用户"
  pnpm preview:real-candidates -- --source arxiv,gdacs --limit 2
  pnpm preview:real-candidates -- --all --limit 1
  pnpm preview:real-candidates -- --json
`);
}
const compact = (items, max = 4) => {
    if (items.length <= max) {
        return items.join("、");
    }
    return `${items.slice(0, max).join("、")} 等 ${items.length} 项`;
};
function formatCandidate(candidate, index) {
    return [
        `${index + 1}. ${candidate.title}`,
        `   分类：${candidate.categories.map((item) => categoryLabels[item]).join("、")}`,
        `   行业：${compact(candidate.industries.map((item) => industryLabels[item]))}`,
        `   分数：影响 ${candidate.impactScore} / 严重 ${candidate.severityScore} / 新鲜 ${candidate.freshnessScore} / 趋势 ${candidate.trendScore}`,
        `   初步说明：${candidate.oneLine}`
    ].join("\n");
}
function formatPreview(preview) {
    const lines = [];
    lines.push("-".repeat(34));
    lines.push(`画像：${preview.profileName}`);
    if (!preview.selectedCandidates.length) {
        lines.push("没有达到入选阈值的真实候选。");
        return lines.join("\n");
    }
    preview.selectedCandidates.forEach((ranked, index) => {
        lines.push(`${index + 1}. [${ranked.importanceScore.level}] ${ranked.candidate.title}`);
        lines.push(`   板块：${ranked.targetSection} / ${ranked.matchedLaneIds.join("、") || "未命中"}`);
        lines.push(`   综合分：${ranked.finalScore}；原因：${ranked.selectedReason}`);
    });
    return lines.join("\n");
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }
    const fetchResults = await (0, rawFetchers_1.fetchRawContentSources)(options.sources, options.limit);
    const rawItems = fetchResults.flatMap((result) => result.items);
    const rawCandidates = (0, rawToCandidate_1.rawItemsToCandidates)(rawItems);
    const dedupeResult = (0, candidateDeduper_1.dedupeCandidateItems)(rawCandidates);
    const candidates = dedupeResult.candidates;
    const profiles = options.profile
        ? candidatePreviewProfiles_1.candidatePreviewProfiles.filter((item) => item.name.includes(options.profile ?? ""))
        : candidatePreviewProfiles_1.candidatePreviewProfiles;
    if (!profiles.length) {
        console.log(`没有找到画像：${options.profile}`);
        process.exitCode = 1;
        return;
    }
    const previews = profiles.map(({ name, profile }) => (0, candidateGenerator_1.buildCandidateIssuePreview)(name, profile, candidates, options.limit));
    if (options.json) {
        console.log(JSON.stringify({ fetchResults, rawCandidates, dedupeResult, candidates, previews }, null, 2));
        return;
    }
    console.log("真实候选排序预览");
    console.log(`来源：${options.sources.map((sourceId) => shortSourceNames[sourceId] ?? sourceId).join("、")}`);
    console.log(`抓取成功：${fetchResults.filter((result) => result.ok).length}/${fetchResults.length}`);
    console.log(`去重：${rawCandidates.length} 条原始候选 -> ${candidates.length} 条候选，合并 ${dedupeResult.removedCount} 条`);
    fetchResults
        .filter((result) => !result.ok)
        .forEach((result) => {
        console.log(`来源失败：${result.sourceName} - ${result.error}`);
    });
    console.log("");
    if (dedupeResult.clusters.length) {
        console.log("合并事件：");
        dedupeResult.clusters.forEach((cluster, index) => {
            console.log(`${index + 1}. ${cluster.title}`);
            console.log(`   合并数量：${cluster.candidateIds.length} 条；原因：${cluster.reason}`);
        });
        console.log("");
    }
    console.log("转换后的候选：");
    console.log(candidates.map(formatCandidate).join("\n\n") || "暂无候选");
    console.log("");
    console.log("进入不同用户画像后的排序：");
    console.log(previews.map(formatPreview).join("\n\n"));
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
