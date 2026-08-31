"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cardDraftPipeline_1 = require("../src/content/cardDraftPipeline");
const candidatePreviewProfiles_1 = require("../src/content/candidatePreviewProfiles");
const profileOptions_1 = require("../src/config/profileOptions");
const candidateDeduper_1 = require("../src/content/candidateDeduper");
const dailyIssueBuilder_1 = require("../src/content/dailyIssueBuilder");
const editionIssueMerger_1 = require("../src/content/editionIssueMerger");
const rawFetchers_1 = require("../src/content/rawFetchers");
const rawToCandidate_1 = require("../src/content/rawToCandidate");
const candidateFreshness_1 = require("../src/content/candidateFreshness");
const sourceCoverage_1 = require("../src/content/sourceCoverage");
const editionFreshness_1 = require("../src/content/editionFreshness");
const translation_1 = require("../src/content/translation");
const rawFetchers_2 = require("../src/content/rawFetchers");
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
    "gov-uk-news",
    "npr-world-rss",
    "sky-world-rss",
    "france24-middle-east-rss",
    "france24-asia-pacific-rss",
    "cnbc-world-rss",
    "un-news-rss",
    "mfa-cn-news",
    "mofcom-trade",
    "openai-news",
    "deepmind-blog",
    "techcrunch-ai-rss",
    "theverge-ai-rss",
    "moe-cn",
    "eol-education",
    "jyb-education",
    "mohrss-cn",
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
    "gov-uk-news",
    "npr-world-rss",
    "sky-world-rss",
    "france24-middle-east-rss",
    "france24-asia-pacific-rss",
    "cnbc-world-rss",
    "un-news-rss",
    "mfa-cn-news",
    "mofcom-trade",
    "openai-news",
    "deepmind-blog",
    "techcrunch-ai-rss",
    "theverge-ai-rss",
    "moe-cn",
    "eol-education",
    "jyb-education",
    "mohrss-cn",
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
    "bbc-world-rss": "bbc-world",
    "bbc-business-rss": "bbc-business",
    "bbc-technology-rss": "bbc-tech",
    "gov-uk-news": "gov-uk",
    "npr-world-rss": "npr-world",
    "sky-world-rss": "sky-world",
    "france24-middle-east-rss": "france24-middle-east",
    "france24-asia-pacific-rss": "france24-asia",
    "wsj-world-rss": "wsj-world",
    "cnbc-world-rss": "cnbc-world",
    "un-news-rss": "un-news",
    "mfa-cn-news": "mfa",
    "mofcom-trade": "mofcom-trade",
    "openai-news": "openai",
    "deepmind-blog": "deepmind",
    "huggingface-blog": "huggingface",
    "techcrunch-ai-rss": "techcrunch-ai",
    "theverge-ai-rss": "theverge-ai",
    "moe-cn": "moe",
    "eol-education": "eol",
    "jyb-education": "jyb",
    "mohrss-cn": "mohrss",
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
const normalizedSupabaseUrl = (value) => value.replace(/\/rest\/v1\/?$/u, "").replace(/\/$/u, "");
const fetchCohortLocations = async () => {
    const baseUrl = process.env?.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env?.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!baseUrl || !serviceRoleKey) {
        return [];
    }
    try {
        const response = await fetch(`${normalizedSupabaseUrl(baseUrl)}/rest/v1/profiles?select=country,living_city,hometown_country,hometown_city`, {
            headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                Accept: "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const rows = await response.json();
        const locations = rows.flatMap((row) => [
            { country: row.country?.trim() ?? "", city: row.living_city?.trim() ?? "" },
            {
                country: row.hometown_country?.trim() || row.country?.trim() || "",
                city: row.hometown_city?.trim() ?? ""
            }
        ].filter((location) => location.country && location.city));
        return Array.from(new Map(locations.map((location) => [`${location.country}|${location.city}`, location])).values());
    }
    catch (error) {
        console.warn(`测试用户城市读取失败，本次仍继续生成公共日报：${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
};
function parseArgs(argv) {
    const options = {
        sources: allSources,
        sourceLimit: 18,
        cardLimit: 24,
        date: today(),
        appPreview: false,
        publish: false,
        json: false,
        help: false,
        edition: "morning",
        baseIssue: undefined,
        asOf: undefined
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
        if (arg === "--edition") {
            const edition = argv[index + 1];
            if (edition === "morning" || edition === "midday" || edition === "evening") {
                options.edition = edition;
            }
            index += 1;
            continue;
        }
        if (arg === "--base-issue") {
            options.baseIssue = argv[index + 1];
            index += 1;
            continue;
        }
        if (arg === "--as-of") {
            const value = argv[index + 1];
            if (value && Number.isFinite(new Date(value).getTime())) {
                options.asOf = value;
            }
            index += 1;
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
            options.sourceLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : options.sourceLimit;
            index += 1;
            continue;
        }
        if (arg === "--cards" || arg === "-c") {
            const parsed = Number(argv[index + 1]);
            options.cardLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 24) : options.cardLimit;
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
  pnpm generate:publish -- --profile public --edition midday
  pnpm generate:publish -- --profile public --edition midday --base-issue latest.json
  pnpm generate:daily-issue -- --json

说明：
  这一步会抓取真实来源，生成候选卡片，质检和自动修复后，组装成一个 DailyIssue JSON。
`);
}
const safeFileName = (value) => value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
const editionLabels = {
    morning: "晨报",
    midday: "午间更新",
    evening: "晚间更新"
};
const sourceAuditFor = (results, issueDate, edition, asOf) => results.map((result) => {
    const datedItems = result.items.filter((item) => item.publishedAt || item.updatedAt);
    const inEditionItems = datedItems.filter((item) => (0, editionFreshness_1.assessEditionFreshness)(item, issueDate, edition, asOf).eligible);
    const publishedTimes = datedItems
        .map((item) => item.publishedAt ?? item.updatedAt)
        .filter((value) => Boolean(value))
        .map((value) => new Date(value).getTime())
        .filter((value) => Number.isFinite(value));
    return {
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        ok: result.ok,
        status: !result.ok ? "failed" : result.items.length ? "healthy" : "empty",
        method: result.method,
        endpointUrl: result.endpointUrl,
        attempts: result.attempts,
        durationMs: result.durationMs,
        fallbackUsed: result.fallbackUsed,
        rawItemCount: result.items.length,
        datedItemCount: datedItems.length,
        inEditionItemCount: inEditionItems.length,
        newestPublishedAt: publishedTimes.length
            ? new Date(Math.max(...publishedTimes)).toISOString()
            : undefined,
        oldestPublishedAt: publishedTimes.length
            ? new Date(Math.min(...publishedTimes)).toISOString()
            : undefined,
        verificationStatus: (0, sourceCoverage_1.sourceRoleFor)(result.sourceId) === "discovery" ||
            result.items.some((item) => item.verificationStatus === "pending")
            ? "pending"
            : "confirmed",
        error: result.error,
        note: result.note
    };
});
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
async function readJsonFileIfExists(filePath) {
    if (!nodeRequire) {
        return undefined;
    }
    const fs = nodeRequire("node:fs/promises");
    const path = nodeRequire("node:path");
    try {
        return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return undefined;
        }
        throw error;
    }
}
const editionOrder = { morning: 1, midday: 2, evening: 3 };
const earlierEditionsFor = (edition) => Object.keys(editionOrder)
    .filter((candidate) => editionOrder[candidate] < editionOrder[edition])
    .sort((left, right) => editionOrder[right] - editionOrder[left]);
async function pendingIssueIsUsable(filePath) {
    const reviewPath = filePath.replace(/\.json$/u, ".review.json");
    const review = await readJsonFileIfExists(reviewPath);
    // A blocked earlier draft can never become the foundation for a later update.
    // A "review" draft is usable here: it remains pending until an explicit approval.
    return review?.status !== "blocked";
}
async function findBaseIssue(options) {
    if (options.edition === "morning") {
        return undefined;
    }
    if (options.baseIssue) {
        const payload = await readJsonFileIfExists(options.baseIssue);
        if (payload?.issue.date === options.date &&
            payload.issue.edition &&
            editionOrder[payload.issue.edition] < editionOrder[options.edition]) {
            return { filePath: options.baseIssue, payload, source: "explicit" };
        }
    }
    for (const edition of earlierEditionsFor(options.edition)) {
        const pendingPath = `pending/${options.date}-${edition}.json`;
        const pendingPayload = await readJsonFileIfExists(pendingPath);
        if (pendingPayload?.issue.date === options.date &&
            pendingPayload.issue.edition === edition &&
            await pendingIssueIsUsable(pendingPath)) {
            return { filePath: pendingPath, payload: pendingPayload, source: "pending" };
        }
        const publishedPaths = [
            `editions/${options.date}/${edition}.json`,
            `outputs/publish/editions/${options.date}/${edition}.json`
        ];
        for (const filePath of publishedPaths) {
            const payload = await readJsonFileIfExists(filePath);
            if (payload?.issue.date === options.date && payload.issue.edition === edition) {
                return { filePath, payload, source: "published" };
            }
        }
    }
    const legacyPaths = ["latest.json", "outputs/publish/latest.json"];
    for (const filePath of legacyPaths) {
        const payload = await readJsonFileIfExists(filePath);
        if (payload?.issue.date === options.date &&
            payload.issue.edition &&
            editionOrder[payload.issue.edition] < editionOrder[options.edition]) {
            return { filePath, payload, source: "published" };
        }
    }
    return undefined;
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
    const generatedAt = options.asOf
        ? new Date(options.asOf).toISOString()
        : new Date().toISOString();
    const baseFetchResults = await (0, rawFetchers_1.fetchRawContentSources)(options.sources, options.sourceLimit);
    const cohortLocations = await fetchCohortLocations();
    const cityLocations = Array.from(new Map([
        {
            country: profileConfig.profile.country,
            city: profileConfig.profile.livingCity.trim()
        },
        {
            country: profileConfig.profile.hometownCountry,
            city: profileConfig.profile.hometownCity.trim()
        },
        ...cohortLocations
    ]
        .filter((location) => location.country && location.city)
        .map((location) => [`${location.country}|${location.city}`, location])).values());
    const cityNames = cityLocations.map((location) => location.city);
    const cityFetchResults = await Promise.all(cityLocations.map((location) => (0, rawFetchers_2.fetchCityContentSource)(location.country, location.city, Math.min(options.sourceLimit, 8))));
    const fetchResults = [...baseFetchResults, ...cityFetchResults];
    const sourceCoverage = (0, sourceCoverage_1.assessSourceCoverage)(fetchResults, {
        localSourceIds: cityFetchResults.map((result) => result.sourceId),
        localCities: cityNames,
        issueDate: options.date,
        edition: options.edition,
        asOf: generatedAt
    });
    const sourceAudit = sourceAuditFor(fetchResults, options.date, options.edition, generatedAt);
    const fetchedRawItems = fetchResults.flatMap((result) => result.items);
    const rawItemsInEdition = (0, editionFreshness_1.filterRawItemsForEdition)(fetchedRawItems, options.date, options.edition, generatedAt);
    const translationResult = await (0, translation_1.translateRawContentItems)(rawItemsInEdition);
    const rawItems = translationResult.items;
    const rawCandidates = (0, rawToCandidate_1.rawItemsToCandidates)(rawItems);
    const dedupeResult = (0, candidateDeduper_1.dedupeCandidateItems)(rawCandidates);
    const recentCandidates = (0, candidateFreshness_1.filterFreshCandidates)(dedupeResult.candidates, options.date);
    const freshCandidates = (0, editionFreshness_1.filterCandidatesForEdition)(recentCandidates, options.date, options.edition, generatedAt);
    const candidateReviewLimit = Math.min(freshCandidates.length, options.cardLimit + 30);
    const cardPipeline = await (0, cardDraftPipeline_1.buildCardDraftsForProfile)({
        profileName: profileConfig.name,
        profile: profileConfig.profile,
        candidates: freshCandidates,
        limit: candidateReviewLimit,
        generatedAt
    });
    const selectedCandidateIds = new Set(cardPipeline.selectedCandidates.map((item) => item.candidate.id));
    const missingPersonalizationCandidates = freshCandidates.filter((candidate) => !selectedCandidateIds.has(candidate.id));
    const additionalPersonalizationPipeline = missingPersonalizationCandidates.length
        ? await (0, cardDraftPipeline_1.buildCardDraftsForProfile)({
            profileName: `${profileConfig.name}-个性化候选补充`,
            profile: profileConfig.profile,
            candidates: missingPersonalizationCandidates,
            limit: Math.min(missingPersonalizationCandidates.length, 80),
            generatedAt,
            includeAllCandidates: true
        })
        : undefined;
    // A review-level card has warnings only. Keep it available for the pool and
    // the daily issue when there are no blocking facts, while still rejecting
    // missing translations, broken source links, and other error-level findings.
    const reviewApprovedCards = (items) => items.filter((item) => item.finalReport.level === "review" &&
        item.finalReport.issues.every((issue) => issue.severity !== "error"));
    const additionalRejectedCards = additionalPersonalizationPipeline?.rejectedCards ?? [];
    const approvedReviewCards = reviewApprovedCards(cardPipeline.rejectedCards);
    const additionalApprovedReviewCards = reviewApprovedCards(additionalRejectedCards);
    const personalizationPublishableCards = [
        ...cardPipeline.publishableCards,
        ...approvedReviewCards,
        ...(additionalPersonalizationPipeline?.publishableCards ?? []),
        ...additionalApprovedReviewCards
    ];
    const coverageLabels = Array.from(new Set([
        ...profileOptions_1.careerDirectionOptions,
        ...profileOptions_1.interestOptions
    ]));
    const profileCoverage = {
        thresholds: {
            minimumCandidates: 20,
            minimumSources: 3,
            minimumQualifiedCards: 10
        },
        candidates: (0, sourceCoverage_1.assessProfileCoverage)(freshCandidates, coverageLabels),
        qualityApproved: (0, sourceCoverage_1.assessProfileCoverage)(personalizationPublishableCards.map((item) => item.rankedCandidate.candidate), coverageLabels)
    };
    const reviewableCards = [
        ...cardPipeline.rejectedCards,
        ...additionalRejectedCards
    ].filter((item) => item.finalReport.level === "review");
    const blockedCards = [
        ...cardPipeline.rejectedCards,
        ...additionalRejectedCards
    ].filter((item) => item.finalReport.level === "blocked");
    // The shared issue is also the safe fallback when an account-specific issue
    // cannot be loaded. Use every quality-approved candidate from the same run,
    // including the supplemental industry pass, so one thin public ranking does
    // not block a complete personalized newspaper for all users.
    const eligibleCards = personalizationPublishableCards;
    const incrementalIssueResult = (0, dailyIssueBuilder_1.buildDailyIssue)({
        userId: profileConfig.profile.phone.replace(/\s+/g, ""),
        date: options.date,
        publishableCards: eligibleCards,
        maxCards: options.cardLimit,
        sizingRules: {
            // Every edition keeps all useful cards needed for a complete three-page issue.
            // Quality checks still run first, so this never admits a blocked draft merely
            // to reach the target. Later editions merge these cards with the earlier issue.
            minimumCards: 15,
            comfortableMaxCards: 20,
            absoluteMaxCards: options.cardLimit
        },
        generatedAt,
        edition: options.edition,
        editionLabel: editionLabels[options.edition],
        coverageWindow: (0, editionFreshness_1.coverageWindowFor)(options.date, options.edition)
    });
    const baseIssue = await findBaseIssue(options);
    const mergeResult = baseIssue
        ? (0, editionIssueMerger_1.mergeEditionIssue)({
            baseIssue: baseIssue.payload.issue,
            incrementalIssue: incrementalIssueResult.issue,
            maxCards: options.cardLimit
        })
        : undefined;
    const issue = mergeResult?.issue ?? {
        ...incrementalIssueResult.issue,
        editionCardIds: incrementalIssueResult.issue.cards.map((card) => card.id),
        carriedCardIds: []
    };
    await (0, translation_1.flushTranslationCache)();
    const output = {
        issue,
        meta: {
            profileName: profileConfig.name,
            cohortLocationCount: cohortLocations.length,
            generatedAt,
            edition: options.edition,
            sourceCoverage,
            profileCoverage,
            sources: options.sources,
            sourceNames: options.sources.map((sourceId) => shortSourceNames[sourceId]),
            fetchedRawItemCount: fetchedRawItems.length,
            rawItemCount: rawItems.length,
            rawCandidateCount: rawCandidates.length,
            dedupedCandidateCount: dedupeResult.candidates.length,
            recentCandidateCount: recentCandidates.length,
            freshCandidateCount: freshCandidates.length,
            translation: translationResult.stats,
            selectedCandidateCount: cardPipeline.selectedCandidates.length,
            publishableCardCount: cardPipeline.publishableCards.length,
            personalizationPoolCardCount: personalizationPublishableCards.length,
            reviewableCardCount: reviewableCards.length,
            rejectedCardCount: blockedCards.length,
            skippedPublishableCardCount: incrementalIssueResult.stats.skippedCardCount,
            stats: incrementalIssueResult.stats,
            editionMerge: {
                required: options.edition !== "morning",
                baseFound: Boolean(baseIssue),
                basePath: baseIssue?.filePath,
                baseSource: baseIssue?.source,
                basedOnGeneratedAt: baseIssue?.payload.issue.generatedAt,
                incrementalCardCount: incrementalIssueResult.issue.cards.length,
                addedCardCount: mergeResult?.addedCardIds.length ?? incrementalIssueResult.issue.cards.length,
                carriedCardCount: mergeResult?.carriedCardIds.length ?? 0,
                replacedCardCount: mergeResult?.replacedCardIds.length ?? 0
            },
            sourceAudit,
            fetchFailures: fetchResults
                .filter((result) => !result.ok)
                .map((result) => ({
                sourceId: result.sourceId,
                sourceName: result.sourceName,
                method: result.method,
                attempts: result.attempts,
                durationMs: result.durationMs,
                fallbackUsed: result.fallbackUsed,
                error: result.error
            })),
            cardReviewFindings: reviewableCards.map((item) => ({
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
        skippedCards: incrementalIssueResult.skippedCards.map((card) => ({
            id: card.id,
            title: card.title,
            importance: card.importance,
            section: card.section
        })),
        personalizationPool: personalizationPublishableCards.map((item) => ({
            candidate: item.rankedCandidate.candidate,
            card: item.card
        }))
    };
    const defaultOutput = `outputs/daily-issues/${options.date}-${safeFileName(profileConfig.name)}.json`;
    const outputPath = await writeJsonFile(options.output ?? defaultOutput, output);
    const sourceHealth = {
        schemaVersion: 1,
        date: options.date,
        edition: options.edition,
        generatedAt,
        summary: {
            totalSources: fetchResults.length,
            healthySources: sourceAudit.filter((source) => source.status === "healthy").length,
            emptySources: sourceAudit.filter((source) => source.status === "empty").length,
            failedSources: sourceAudit.filter((source) => source.status === "failed").length,
            currentWindowItems: sourceAudit.reduce((sum, source) => sum + source.inEditionItemCount, 0),
            sourceAvailabilityReady: sourceCoverage.sourceAvailabilityReady,
            currentCoverageReady: sourceCoverage.currentCoverageReady
        },
        coverage: sourceCoverage,
        sources: sourceAudit
    };
    const sourceHealthPath = await writeJsonFile(options.publish
        ? `outputs/publish/audit/source-health/${options.date}-${options.edition}.json`
        : `outputs/audit/source-health/${options.date}-${options.edition}.json`, sourceHealth);
    const appPreviewPath = options.appPreview
        ? await writeJsonFile("src/data/generatedDailyIssue.json", output)
        : undefined;
    const publicIssue = {
        ...issue,
        id: `daily-public-${options.date}`,
        userId: "public"
    };
    const publicPayload = {
        schemaVersion: 2,
        publishedAt: generatedAt,
        issue: publicIssue
    };
    const publishLatestPath = options.publish
        ? await writeJsonFile("outputs/publish/latest.json", publicPayload)
        : undefined;
    const publishArchivePath = options.publish
        ? await writeJsonFile(`outputs/publish/issues/${options.date}.json`, publicPayload)
        : undefined;
    const publishEditionPath = options.publish
        ? await writeJsonFile(`outputs/publish/editions/${options.date}/${options.edition}.json`, publicPayload)
        : undefined;
    if (options.json) {
        console.log(JSON.stringify({ ...output, outputPath, sourceHealthPath, appPreviewPath, publishLatestPath, publishArchivePath, publishEditionPath }, null, 2));
        return;
    }
    console.log("今日报纸数据已生成");
    console.log(`画像：${profileConfig.name}`);
    console.log(`来源：${options.sources.map((sourceId) => shortSourceNames[sourceId]).join("、")}`);
    console.log(`时段：${editionLabels[options.edition]}；来源可用：${sourceCoverage.sourceAvailabilityReady ? "通过" : "未通过"}；当期输入：${sourceCoverage.currentCoverageReady ? "通过" : "待复核"}`);
    console.log(`候选：${rawCandidates.length} 条原始候选 -> ${dedupeResult.candidates.length} 条去重后候选`);
    console.log(`卡片：${cardPipeline.publishableCards.length} 张自动通过，${reviewableCards.length} 张进入人工复核，${blockedCards.length} 张被拦截`);
    console.log(`日报：${issue.cards.length} 张卡片，约 ${issue.estimatedReadMinutes} 分钟读完，${issue.pageCount} 版`);
    console.log(`来源健康：${sourceHealthPath}`);
    if (options.edition !== "morning") {
        console.log(baseIssue
            ? `增量合并：新增 ${mergeResult?.addedCardIds.length ?? 0} 条，沿用 ${mergeResult?.carriedCardIds.length ?? 0} 条`
            : "增量合并：没有找到当天更早且合格的待审或已发布版次，本稿会被审稿规则阻止发布");
    }
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
    if (publishEditionPath) {
        console.log(`分时归档：${publishEditionPath}`);
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
