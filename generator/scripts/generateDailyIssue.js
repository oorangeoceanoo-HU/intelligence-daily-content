"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cardDraftPipeline_1 = require("../src/content/cardDraftPipeline");
const candidatePreviewProfiles_1 = require("../src/content/candidatePreviewProfiles");
const candidateDeduper_1 = require("../src/content/candidateDeduper");
const dailyIssueBuilder_1 = require("../src/content/dailyIssueBuilder");
const rawFetchers_1 = require("../src/content/rawFetchers");
const rawToCandidate_1 = require("../src/content/rawToCandidate");
const candidateFreshness_1 = require("../src/content/candidateFreshness");
const stableSources = [
    "arxiv-cs-api",
    "cas-science-news",
    "mohurd-construction",
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
const allSources = [
    "arxiv-cs-api",
    "cas-science-news",
    "mohurd-construction",
    "gdacs-feed",
    "gov-cn-policy-library",
    "mem-cn",
    "cac-cn",
    "xinhua-world",
    "xinhua-tech",
    "moe-cn",
    "chrm-mohrss",
    "stats-cn-data",
    "mofcom-consumption",
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
    "moe-cn": "moe",
    "chrm-mohrss": "chrm",
    "stats-cn-data": "stats",
    "mofcom-consumption": "mofcom",
    "gdelt-doc-api": "gdelt",
    "reliefweb-api": "reliefweb"
};
const today = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
};
function parseArgs(argv) {
    const options = {
        sources: stableSources,
        sourceLimit: 5,
        cardLimit: 30,
        date: today(),
        appPreview: false,
        publish: false,
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
        if (arg === "--app-preview") {
            options.appPreview = true;
            continue;
        }
        if (arg === "--publish") {
            options.publish = true;
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
        if (arg === "--date" || arg === "-d") {
            options.date = argv[index + 1] ?? options.date;
            index += 1;
            continue;
        }
        if (arg === "--output" || arg === "-o") {
            options.output = argv[index + 1];
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
        if (arg === "--source-limit" || arg === "-l") {
            const parsed = Number(argv[index + 1]);
            options.sourceLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10) : options.sourceLimit;
            index += 1;
            continue;
        }
        if (arg === "--cards" || arg === "-c") {
            const parsed = Number(argv[index + 1]);
            options.cardLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : options.cardLimit;
            index += 1;
        }
    }
    return options;
}
function printHelp() {
    console.log(`生成今日报纸本地数据

用法：
  pnpm generate:daily-issue
  pnpm generate:daily-issue -- --profile "AI 产品用户"
  pnpm generate:daily-issue -- --profile "教师用户" --source moe --source-limit 2 --cards 6
  pnpm generate:app-preview -- --profile "AI 产品用户"
  pnpm generate:publish -- --profile "AI 产品用户"
  pnpm generate:daily-issue -- --json

说明：
  这一步会抓取真实来源，生成候选卡片，质检和自动修复后，组装成一个 DailyIssue JSON。
`);
}
const safeFileName = (value) => value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
const nodeRequire = typeof require === "function" ? require : undefined;
async function writeJsonFile(filePath, value) {
    if (!nodeRequire) {
        throw new Error("Writing files is only available in the Node preview runtime");
    }
    const fs = nodeRequire("node:fs/promises");
    const path = nodeRequire("node:path");
    const resolved = path.resolve(filePath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
    return resolved;
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }
    const profileAliases = {
        ai: "PREVIEW-AI",
        teacher: "PREVIEW-EDU",
        hr: "PREVIEW-HR",
        operations: "PREVIEW-OPS",
        public: "PREVIEW-PUBLIC"
    };
    const requestedProfile = options.profile?.trim();
    const profileInviteCode = requestedProfile
        ? profileAliases[requestedProfile.toLowerCase()]
        : undefined;
    const profileConfig = requestedProfile
        ? candidatePreviewProfiles_1.candidatePreviewProfiles.find((item) => item.profile.inviteCode === profileInviteCode ||
            item.name.includes(requestedProfile))
        : candidatePreviewProfiles_1.candidatePreviewProfiles[0];
    if (!profileConfig) {
        console.log(`没有找到画像：${options.profile}`);
        process.exitCode = 1;
        return;
    }
    const generatedAt = new Date().toISOString();
    const fetchResults = await (0, rawFetchers_1.fetchRawContentSources)(options.sources, options.sourceLimit);
    const rawItems = fetchResults.flatMap((result) => result.items);
    const rawCandidates = (0, rawToCandidate_1.rawItemsToCandidates)(rawItems);
    const dedupeResult = (0, candidateDeduper_1.dedupeCandidateItems)(rawCandidates);
    const freshCandidates = (0, candidateFreshness_1.filterFreshCandidates)(dedupeResult.candidates, options.date);
    const candidateReviewLimit = Math.min(freshCandidates.length, options.cardLimit + 30);
    const cardPipeline = await (0, cardDraftPipeline_1.buildCardDraftsForProfile)({
        profileName: profileConfig.name,
        profile: profileConfig.profile,
        candidates: freshCandidates,
        limit: candidateReviewLimit,
        generatedAt
    });
    const reviewableCards = cardPipeline.rejectedCards.filter((item) => item.finalReport.level === "review");
    const blockedCards = cardPipeline.rejectedCards.filter((item) => item.finalReport.level === "blocked");
    const eligibleCards = [...cardPipeline.publishableCards, ...reviewableCards];
    const issueResult = (0, dailyIssueBuilder_1.buildDailyIssue)({
        userId: profileConfig.profile.phone.replace(/\s+/g, ""),
        date: options.date,
        publishableCards: eligibleCards,
        maxCards: options.cardLimit,
        generatedAt
    });
    const output = {
        issue: issueResult.issue,
        meta: {
            profileName: profileConfig.name,
            generatedAt,
            sources: options.sources,
            sourceNames: options.sources.map((sourceId) => shortSourceNames[sourceId]),
            rawItemCount: rawItems.length,
            rawCandidateCount: rawCandidates.length,
            dedupedCandidateCount: dedupeResult.candidates.length,
            freshCandidateCount: freshCandidates.length,
            selectedCandidateCount: cardPipeline.selectedCandidates.length,
            publishableCardCount: cardPipeline.publishableCards.length,
            reviewableCardCount: reviewableCards.length,
            rejectedCardCount: blockedCards.length,
            skippedPublishableCardCount: issueResult.stats.skippedCardCount,
            stats: issueResult.stats,
            fetchFailures: fetchResults
                .filter((result) => !result.ok)
                .map((result) => ({
                sourceId: result.sourceId,
                sourceName: result.sourceName,
                error: result.error
            })),
            cardReviewFindings: reviewableCards
                .filter((item) => issueResult.issue.cards.some((card) => card.id === item.card.id))
                .map((item) => ({
                cardId: item.card.id,
                cardTitle: item.card.title,
                issues: item.finalReport.issues.map((issue) => issue.message)
            }))
        },
        reviewableCards: reviewableCards.map((item) => ({
            id: item.card.id,
            title: item.card.title,
            finalLabel: item.finalReport.label,
            finalScore: item.finalReport.score,
            issues: item.finalReport.issues.map((issue) => issue.message)
        })),
        rejectedCards: blockedCards.map((item) => ({
            id: item.card.id,
            title: item.card.title,
            finalLabel: item.finalReport.label,
            finalScore: item.finalReport.score,
            issues: item.finalReport.issues.map((issue) => issue.message)
        })),
        skippedCards: issueResult.skippedCards.map((card) => ({
            id: card.id,
            title: card.title,
            importance: card.importance,
            section: card.section
        }))
    };
    const defaultOutput = `outputs/daily-issues/${options.date}-${safeFileName(profileConfig.name)}.json`;
    const outputPath = await writeJsonFile(options.output ?? defaultOutput, output);
    const appPreviewPath = options.appPreview
        ? await writeJsonFile("src/data/generatedDailyIssue.json", output)
        : undefined;
    const publicIssue = {
        ...issueResult.issue,
        id: `daily-public-${options.date}`,
        userId: "public"
    };
    const publicPayload = {
        schemaVersion: 1,
        publishedAt: generatedAt,
        issue: publicIssue
    };
    const publishLatestPath = options.publish
        ? await writeJsonFile("outputs/publish/latest.json", publicPayload)
        : undefined;
    const publishArchivePath = options.publish
        ? await writeJsonFile(`outputs/publish/issues/${options.date}.json`, publicPayload)
        : undefined;
    if (options.json) {
        console.log(JSON.stringify({ ...output, outputPath, appPreviewPath, publishLatestPath, publishArchivePath }, null, 2));
        return;
    }
    console.log("今日报纸数据已生成");
    console.log(`画像：${profileConfig.name}`);
    console.log(`来源：${options.sources.map((sourceId) => shortSourceNames[sourceId]).join("、")}`);
    console.log(`候选：${rawCandidates.length} 条原始候选 -> ${dedupeResult.candidates.length} 条去重后候选`);
    console.log(`卡片：${cardPipeline.publishableCards.length} 张自动通过，${reviewableCards.length} 张进入人工复核，${blockedCards.length} 张被拦截`);
    console.log(`日报：${issueResult.issue.cards.length} 张卡片，约 ${issueResult.issue.estimatedReadMinutes} 分钟读完，${issueResult.issue.pageCount} 版`);
    console.log(`输出：${outputPath}`);
    if (appPreviewPath) {
        console.log(`手机预览：${appPreviewPath}`);
    }
    if (publishLatestPath) {
        console.log(`待发布日报：${publishLatestPath}`);
    }
    if (publishArchivePath) {
        console.log(`公开归档：${publishArchivePath}`);
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
