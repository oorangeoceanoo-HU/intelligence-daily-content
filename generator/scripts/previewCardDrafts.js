"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const articleDetails_1 = require("../src/content/articleDetails");
const candidateGenerator_1 = require("../src/content/candidateGenerator");
const cardDraftQuality_1 = require("../src/content/cardDraftQuality");
const cardDraftRepair_1 = require("../src/content/cardDraftRepair");
const candidatePreviewProfiles_1 = require("../src/content/candidatePreviewProfiles");
const candidateDeduper_1 = require("../src/content/candidateDeduper");
const rawFetchers_1 = require("../src/content/rawFetchers");
const rawToCandidate_1 = require("../src/content/rawToCandidate");
const defaultSources = ["stats-cn-data", "mofcom-consumption"];
const allSources = [
    "arxiv-cs-api",
    "gdacs-feed",
    "gov-cn-policy-library",
    "mem-cn",
    "cac-cn",
    "xinhua-world",
    "xinhua-tech",
    "moe-cn",
    "chrm-mohrss",
    "stats-cn-data",
    "mofcom-consumption"
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
    "moe-cn": "moe",
    "chrm-mohrss": "chrm",
    "stats-cn-data": "stats",
    "mofcom-consumption": "mofcom",
    "gdelt-doc-api": "gdelt",
    "reliefweb-api": "reliefweb"
};
function parseArgs(argv) {
    const options = {
        sources: defaultSources,
        limit: 3,
        profile: "运营用户",
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
            const rawSources = (argv[index + 1] ?? "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
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
            options.limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 5) : options.limit;
            index += 1;
        }
    }
    return options;
}
function printHelp() {
    console.log(`真实卡片草稿预览
这一命令会：
  1. 从真实来源抓候选标题和链接
  2. 转成候选事件并按用户画像排序
  3. 抓取入选候选的正文
  4. 生成 App 详情卡片草稿

用法：
  pnpm preview:card-drafts
  pnpm preview:card-drafts -- --profile "教师用户" --source moe --limit 2
  pnpm preview:card-drafts -- --profile "HR 用户" --source chrm --limit 2
  pnpm preview:card-drafts -- --profile "运营用户" --source stats,mofcom --limit 3
  pnpm preview:card-drafts -- --json
`);
}
const detailForCandidate = (details, candidate) => details.find((detail) => detail.candidateId === candidate.id);
async function buildProfileCardDraftPreview(profileName, candidates, rawCandidateCount, dedupedCandidateCount, limit) {
    const previewProfile = candidatePreviewProfiles_1.candidatePreviewProfiles.find((item) => item.name.includes(profileName));
    if (!previewProfile) {
        throw new Error(`没有找到画像：${profileName}`);
    }
    const issuePreview = (0, candidateGenerator_1.buildCandidateIssuePreview)(previewProfile.name, previewProfile.profile, candidates, limit);
    const selectedCandidates = issuePreview.selectedCandidates.slice(0, limit);
    const details = await (0, articleDetails_1.fetchArticleDetails)(selectedCandidates.map((ranked) => ranked.candidate));
    const generatedAt = new Date().toISOString();
    const cards = selectedCandidates.map((ranked) => {
        const detail = detailForCandidate(details, ranked.candidate);
        const enrichedCandidate = detail
            ? (0, articleDetails_1.enrichCandidateWithArticleDetail)(ranked.candidate, detail)
            : ranked.candidate;
        return (0, candidateGenerator_1.rankedCandidateToCard)({
            ...ranked,
            candidate: enrichedCandidate
        }, generatedAt);
    });
    const qualityReports = cards.map((card, index) => (0, cardDraftQuality_1.evaluateCardDraftQuality)(card, details[index]));
    const repairResults = cards.map((card, index) => (0, cardDraftRepair_1.repairCardDraft)(card, qualityReports[index], details[index]));
    return {
        profileName: previewProfile.name,
        rawCandidateCount,
        dedupedCandidateCount,
        selectedCandidates,
        details,
        cards,
        qualityReports,
        repairResults
    };
}
function printQuality(report, repairResult) {
    const lines = [];
    if (repairResult?.changed) {
        const finalReport = repairResult.repairedReport;
        lines.push(`   质量门槛：${report.label}，${report.score} 分 -> 自动修复后 ${finalReport.label}，${finalReport.score} 分`);
        lines.push(`   自动修复：${repairResult.actions.map((action) => action.label).join("、")}`);
        if (!finalReport.issues.length) {
            lines.push("   质检说明：自动修复后，未发现阻止发布的问题。");
            return lines;
        }
        finalReport.issues.forEach((issue) => {
            const prefix = issue.severity === "error" ? "需拦截" : "需复核";
            lines.push(`   - ${prefix}：${issue.message}`);
        });
        return lines;
    }
    lines.push(`   质量门槛：${report.label}，${report.score} 分`);
    if (!report.issues.length) {
        lines.push("   质检说明：未发现阻止发布的问题。");
        return lines;
    }
    report.issues.forEach((issue) => {
        const prefix = issue.severity === "error" ? "需拦截" : "需复核";
        lines.push(`   - ${prefix}：${issue.message}`);
    });
    return lines;
}
function printCard(card, detail, qualityReport, repairResult, index) {
    const lines = [];
    lines.push(`${index + 1}. [${card.importance}] ${card.title}`);
    lines.push(`   一句话导读：${card.oneLine}`);
    lines.push(`   来源可信度：${card.credibility}`);
    lines.push(`   正文抓取：${detail?.status ?? "unknown"}，约 ${detail?.charCount ?? 0} 字符`);
    if (qualityReport) {
        lines.push(...printQuality(qualityReport, repairResult));
    }
    lines.push(`   图片：${card.images.length} 张`);
    lines.push("   事件背景：");
    lines.push(`   ${card.body.background}`);
    lines.push("   关键进展：");
    lines.push(`   ${card.body.keyProgress}`);
    lines.push("   为什么重要：");
    lines.push(`   ${card.body.whyItMatters}`);
    if (card.body.userRelevance) {
        lines.push("   和用户有什么关系：");
        lines.push(`   ${card.body.userRelevance}`);
    }
    if (card.body.whatToWatch) {
        lines.push("   后续看什么：");
        lines.push(`   ${card.body.whatToWatch}`);
    }
    lines.push(`   原文：${card.sourceLinks[0]?.url ?? "无"}`);
    if (detail?.error) {
        lines.push(`   抓取说明：${detail.error}`);
    }
    return lines.join("\n");
}
function printPreview(preview) {
    const lines = [];
    lines.push(`画像：${preview.profileName}`);
    lines.push(`候选：${preview.rawCandidateCount} 条原始候选 -> ${preview.dedupedCandidateCount} 条去重后候选`);
    if (!preview.cards.length) {
        lines.push("没有达到入选阈值的卡片草稿。");
        return lines.join("\n");
    }
    preview.cards.forEach((card, index) => {
        const detail = preview.details[index];
        const qualityReport = preview.qualityReports[index];
        const repairResult = preview.repairResults[index];
        const displayCard = repairResult?.changed ? repairResult.card : card;
        lines.push("");
        lines.push(printCard(displayCard, detail, qualityReport, repairResult, index));
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
    const profileName = options.profile ?? "运营用户";
    const preview = await buildProfileCardDraftPreview(profileName, dedupeResult.candidates, rawCandidates.length, dedupeResult.candidates.length, options.limit);
    if (options.json) {
        console.log(JSON.stringify({ fetchResults, dedupeResult, preview }, null, 2));
        return;
    }
    console.log("真实卡片草稿预览");
    console.log(`来源：${options.sources.map((sourceId) => shortSourceNames[sourceId]).join("、")}`);
    console.log(`抓取成功：${fetchResults.filter((result) => result.ok).length}/${fetchResults.length}`);
    fetchResults
        .filter((result) => !result.ok)
        .forEach((result) => {
        console.log(`来源失败：${result.sourceName} - ${result.error}`);
    });
    console.log("");
    console.log(printPreview(preview));
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
