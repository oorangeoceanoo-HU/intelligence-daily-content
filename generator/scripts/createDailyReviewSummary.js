"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const textSimilarity_1 = require("../src/content/textSimilarity");
const editionFreshness_1 = require("../src/content/editionFreshness");
const nodeRequire = typeof require === "function" ? require : undefined;
const DAY_MS = 24 * 60 * 60 * 1000;
function parseArgs(argv) {
    const values = new Map();
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--") {
            continue;
        }
        if (arg.startsWith("--") && argv[index + 1]) {
            values.set(arg.slice(2), argv[index + 1]);
            index += 1;
        }
    }
    const date = values.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
        throw new Error("--date must use YYYY-MM-DD");
    }
    return {
        date,
        reviewInput: values.get("review-input") ?? `outputs/review/${date}.json`,
        candidateInput: values.get("candidate-input") ?? `outputs/publish/issues/${date}.json`,
        pendingOutput: values.get("pending-output") ?? `pending/${date}.json`,
        summaryOutput: values.get("summary-output") ?? `pending/${date}.md`,
        reportOutput: values.get("report-output") ?? `pending/${date}.review.json`,
        recheckInput: values.get("recheck-input"),
        previousReportInput: values.get("previous-report-input")
    };
}
const calendarDay = (value) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/u);
    return match
        ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : undefined;
};
const compact = (value) => (value ?? "").replace(/\s+/gu, " ").trim();
const countMatches = (value, pattern) => value.match(pattern)?.length ?? 0;
const containsUntranslatedEnglish = (value, title = false) => {
    const latinLetters = countMatches(value, /[A-Za-z]/g);
    const cjkChars = countMatches(value, /[\u4e00-\u9fff]/g);
    return title
        ? latinLetters >= 12 && cjkChars === 0
        : latinLetters >= 120 && latinLetters > cjkChars * 1.4;
};
const writeText = async (filePath, value) => {
    if (!nodeRequire) {
        throw new Error("Node runtime is required");
    }
    const fs = nodeRequire("node:fs/promises");
    const path = nodeRequire("node:path");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, value, "utf8");
};
const readJson = async (filePath) => {
    if (!nodeRequire) {
        throw new Error("Node runtime is required");
    }
    const fs = nodeRequire("node:fs/promises");
    return JSON.parse(await fs.readFile(filePath, "utf8"));
};
const sha256 = (value) => {
    if (!nodeRequire) {
        throw new Error("Node runtime is required");
    }
    return nodeRequire("node:crypto").createHash("sha256").update(value, "utf8").digest("hex");
};
const addFinding = (findings, level, code, message, card) => {
    findings.push({
        level,
        code,
        message,
        cardId: card?.id,
        cardTitle: card?.title
    });
};
const repeatedFieldGroups = (issue, selector) => {
    const groups = new Map();
    issue.cards.forEach((card) => {
        const value = compact(selector(card));
        if (!value) {
            return;
        }
        groups.set(value, [...(groups.get(value) ?? []), card]);
    });
    return [...groups.entries()].filter(([, cards]) => cards.length >= 3);
};
function inspectIssue(expectedDate, review, candidate) {
    const findings = [];
    const issue = candidate.issue;
    if (review.issue.date !== expectedDate || issue.date !== expectedDate) {
        addFinding(findings, "blocker", "date-mismatch", "待审稿日期与本次出版日期不一致。");
    }
    const reviewIds = review.issue.cards.map((card) => card.id).join("|");
    const candidateIds = issue.cards.map((card) => card.id).join("|");
    if (reviewIds !== candidateIds || review.issue.generatedAt !== issue.generatedAt) {
        addFinding(findings, "blocker", "candidate-mismatch", "公开候选稿与内部复检稿不是同一份内容。");
    }
    if (issue.cards.length === 0) {
        addFinding(findings, "blocker", "too-few-cards", "当天没有任何通过基础质量检查的日报内容；系统会保留上一份可用日报，避免发布空日报。");
    }
    else if (issue.cards.length < 15) {
        addFinding(findings, "warning", "compact-issue", `当天只有 ${issue.cards.length} 条合格内容，将按原有日报结构发布精简版；系统不会用旧闻或其他行业内容凑数。`);
    }
    if (issue.cards.length > 24) {
        addFinding(findings, "blocker", "too-many-cards", `当前有 ${issue.cards.length} 条，超过 24 条绝对上限。`);
    }
    const largestPage = issue.pageCount ? Math.ceil(issue.cards.length / issue.pageCount) : issue.cards.length;
    if (!issue.pageCount || largestPage > 10) {
        addFinding(findings, "blocker", "page-overflow", "至少有一个版面会超过 10 条，阅读密度过高。");
    }
    const issueDay = calendarDay(expectedDate);
    let olderThanThreeDays = 0;
    if ((review.meta?.translation?.failed ?? 0) > 0) {
        addFinding(findings, "warning", "translation-failures", `有 ${review.meta?.translation?.failed} 条英文或多语言候选没有完成中文化，当前翻译通道为 ${review.meta?.translation?.provider ?? "unknown"}；这些候选已从最终日报排除。`);
    }
    if (review.meta?.editionMerge?.required && !review.meta.editionMerge.baseFound) {
        addFinding(findings, "blocker", "missing-base-edition", "午间或晚间更新没有找到当天更早且已批准的版次，不能把一小段增量内容当作完整日报发布。");
    }
    if (issue.edition !== "morning" &&
        issue.editionCardIds &&
        issue.editionCardIds.length === 0) {
        addFinding(findings, "blocker", "empty-edition-update", "本时段没有新增或替换任何信息，不需要发布一份内容不变的更新。");
    }
    const editionCardIds = new Set(issue.editionCardIds ?? issue.cards.map((card) => card.id));
    issue.cards.forEach((card) => {
        if (/\.\.\.|…/u.test(card.title)) {
            addFinding(findings, "blocker", "truncated-title", "标题仍有截断符号，需要改成完整标题。", card);
        }
        if (!compact(card.body.userRelevance)) {
            addFinding(findings, "blocker", "missing-user-relevance", "缺少直接面向用户的相关性说明。", card);
        }
        const cardFields = [
            card.oneLine,
            card.body.background,
            card.body.keyProgress,
            card.body.whyItMatters,
            card.body.userRelevance,
            card.body.whatToWatch
        ].filter((value) => Boolean(value));
        if (containsUntranslatedEnglish(card.title, true) ||
            cardFields.some((value) => containsUntranslatedEnglish(value))) {
            addFinding(findings, "blocker", "english-not-translated", "最终日报仍含明显未翻译的英文内容，不能发布。", card);
        }
        if (!card.sourceLinks.length) {
            addFinding(findings, "blocker", "missing-source", "没有可核验的原文来源。", card);
        }
        card.sourceLinks.forEach((source) => {
            if (!compact(source.sourceId) || !compact(source.url)) {
                addFinding(findings, "blocker", "missing-source-trace", "原文缺少来源编号或可打开的原文地址。", card);
            }
            if (!compact(source.fetchedAt) || !source.sourceMethod || !source.verificationStatus) {
                addFinding(findings, "blocker", "missing-fetch-trace", "原文缺少抓取时间、抓取方式或核实状态，无法追溯本次采集。", card);
            }
            const sourceDay = calendarDay(source.publishedAt);
            if (sourceDay === undefined || issueDay === undefined) {
                addFinding(findings, "blocker", "missing-source-date", "原文缺少可核验的发布日期。", card);
                return;
            }
            const ageDays = (issueDay - sourceDay) / DAY_MS;
            if (ageDays < 0) {
                addFinding(findings, "blocker", "future-source", "原文发布日期晚于日报日期。", card);
            }
            else if (ageDays > 7) {
                addFinding(findings, "blocker", "stale-source", `原文距日报日期已有 ${ageDays} 天。`, card);
            }
            else if (ageDays > 3) {
                olderThanThreeDays += 1;
            }
        });
        const primarySource = card.sourceLinks[0];
        if (primarySource && candidate.issue.edition && editionCardIds.has(card.id)) {
            const freshness = (0, editionFreshness_1.assessEditionFreshness)(primarySource, expectedDate, candidate.issue.edition, candidate.issue.generatedAt);
            if (!freshness.eligible) {
                addFinding(findings, "blocker", "source-outside-edition-window", `主来源不在本版次时间窗口内：${freshness.reason}`, card);
            }
        }
        const titleContent = [card.oneLine, card.body.background, card.body.keyProgress].join(" ");
        const titleContentCoverage = (0, textSimilarity_1.textContainment)(card.title, titleContent);
        if (titleContentCoverage < 0.14) {
            addFinding(findings, "blocker", "title-content-mismatch", "标题与导读、背景和进展缺少共同事件信息，不能确认它们讲的是同一件事。", card);
        }
        else if ((0, textSimilarity_1.textSimilarity)(card.title, card.oneLine) < 0.05 &&
            (0, textSimilarity_1.textContainment)(card.title, card.oneLine) < 0.14) {
            addFinding(findings, "warning", "title-lead-low-overlap", "标题和一句话导读的共同信息偏少，需要人工确认是否讲的是同一件事。", card);
        }
        if ((0, textSimilarity_1.textSimilarity)(card.oneLine, card.body.background) > 0.64) {
            addFinding(findings, "warning", "lead-background-repetition", "一句话导读与事件背景重复度较高。", card);
        }
    });
    if (olderThanThreeDays > 0) {
        addFinding(findings, "warning", "older-content-present", `共有 ${olderThanThreeDays} 个来源超过近三日范围，需要确认它们仍值得进入今天的日报。`);
    }
    const primarySourceCounts = new Map();
    issue.cards.forEach((card) => {
        const sourceId = card.sourceLinks[0]?.sourceId;
        if (sourceId) {
            primarySourceCounts.set(sourceId, (primarySourceCounts.get(sourceId) ?? 0) + 1);
        }
    });
    primarySourceCounts.forEach((count, sourceId) => {
        const share = issue.cards.length ? count / issue.cards.length : 0;
        if (share > 0.5) {
            addFinding(findings, "blocker", "source-concentration", `${sourceId} 占 ${count}/${issue.cards.length} 条，单一来源超过一半，不能视为覆盖充分。`);
        }
        else if (share > 0.4) {
            addFinding(findings, "warning", "source-concentration", `${sourceId} 占 ${count}/${issue.cards.length} 条，需要确认没有因其他来源缺失而过度集中。`);
        }
    });
    const repeatedChecks = [
        ["repeated-why", "“为什么重要”", (card) => card.body.whyItMatters],
        ["repeated-relevance", "“和你有什么关系”", (card) => card.body.userRelevance],
        ["repeated-watch", "“接下来关注什么”", (card) => card.body.whatToWatch]
    ];
    repeatedChecks.forEach(([code, label, selector]) => {
        repeatedFieldGroups(issue, selector).forEach(([, cards]) => {
            addFinding(findings, "warning", code, `有 ${cards.length} 张卡片使用了完全相同的${label}文案，可能显得模板化。`);
        });
    });
    if (review.meta?.fetchFailures?.length) {
        addFinding(findings, "warning", "source-fetch-failures", `有 ${review.meta.fetchFailures.length} 个来源抓取失败，需要确认是否影响当天覆盖面。`);
    }
    review.meta?.sourceCoverage?.lanes.forEach((lane) => {
        if (lane.required && !lane.ready) {
            addFinding(findings, "blocker", `coverage-${lane.id}`, `${lane.label}来源覆盖不足：需要至少 ${lane.minimumSuccessfulSources} 个有内容的来源，当前只有 ${lane.successfulSourceIds.length} 个。`);
        }
        else if (!lane.required && !lane.ready) {
            addFinding(findings, "warning", `coverage-${lane.id}`, `${lane.label}尚未形成真实来源覆盖：${lane.note}`);
        }
        if (lane.currentWindowChecked && !lane.currentReady) {
            addFinding(findings, lane.currentInputRequired ? "blocker" : "warning", `current-coverage-${lane.id}`, lane.currentInputRequired
                ? `${lane.label}在本时段没有足够的新输入：需要至少 ${lane.minimumCurrentSources} 个来源，当前为 ${lane.currentSourceIds.length} 个。`
                : `${lane.label}在本时段没有新的可用条目：已监测 ${lane.successfulSourceIds.length} 个可访问来源，但当前只命中 ${lane.currentSourceIds.length} 个。${lane.note}`);
        }
    });
    review.meta?.cardReviewFindings?.forEach((item) => {
        item.issues.forEach((message) => {
            findings.push({
                level: "warning",
                code: "card-needs-human-review",
                message,
                cardId: item.cardId,
                cardTitle: item.cardTitle
            });
        });
    });
    return findings;
}
const statusText = (status) => ({
    ready: "自动质量门通过",
    review: "可以自动发布，建议抽查提示项",
    blocked: "存在必须修改的问题"
})[status];
function buildMarkdown(report, candidate) {
    const lines = [
        `# ${report.date} 日报待审摘要`,
        "",
        `状态：**${statusText(report.status)}**`,
        "",
        `- 内容数量：${report.counts.cards} 条，共 ${report.counts.pages} 版`,
        `- 出版时段：${candidate.issue.editionLabel ?? candidate.issue.edition ?? "未标记"}`,
        `- 原始候选：${report.counts.rawItems} 条`,
        `- 近七日候选：${report.counts.freshCandidates} 条`,
        `- 自动复检通过：${report.counts.publishableCards} 条`,
        `- 复核提示卡片：${report.counts.reviewableCards} 条`,
        `- 必须修改：${report.counts.blockers} 项`,
        `- 建议复核：${report.counts.warnings} 项`,
        "",
        "## 今日内容",
        ""
    ];
    const coverage = candidate.issue.coverageWindow;
    if (coverage) {
        lines.splice(6, 0, `- 覆盖窗口：${coverage.start} 至 ${coverage.end}`);
    }
    if (candidate.issue.editionCardIds) {
        lines.splice(7, 0, `- 本时段新增或替换：${candidate.issue.editionCardIds.length} 条；沿用上一版：${candidate.issue.carriedCardIds?.length ?? 0} 条`);
    }
    candidate.issue.cards.forEach((card, index) => {
        const sourceDate = card.sourceLinks[0]?.publishedAt?.slice(0, 10) ?? "日期未知";
        lines.push(`${index + 1}. [${card.importance}] ${card.title}（${sourceDate}）`);
    });
    lines.push("", "## 检查提示", "");
    if (!report.findings.length) {
        lines.push("- 未发现自动检查问题，质量门允许自动发布。");
    }
    else {
        report.findings.forEach((finding) => {
            const prefix = finding.level === "blocker" ? "必须修改" : "需要复核";
            const card = finding.cardTitle ? `《${finding.cardTitle}》：` : "";
            lines.push(`- [${prefix}] ${card}${finding.message}`);
        });
    }
    lines.push("", "## 发布规则", "", "App 不会读取这份待审稿。没有阻断项时，质量门会自动出版对应版次；存在阻断项时保留上一份合格的 `latest.json`，等待修正和重新检查。", "");
    return lines.join("\n");
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    const previousReport = options.recheckInput
        ? await readJson(options.previousReportInput ?? `pending/${options.date}.review.json`)
        : undefined;
    const candidate = await readJson(options.recheckInput ?? options.candidateInput);
    const review = options.recheckInput
        ? {
            issue: candidate.issue,
            meta: {
                rawItemCount: previousReport?.counts.rawItems ?? 0,
                freshCandidateCount: previousReport?.counts.freshCandidates ?? 0,
                publishableCardCount: previousReport?.counts.publishableCards ?? candidate.issue.cards.length,
                reviewableCardCount: previousReport?.counts.reviewableCards ?? 0,
                rejectedCardCount: previousReport?.counts.rejectedCards ?? 0
            }
        }
        : await readJson(options.reviewInput);
    const candidateText = `${JSON.stringify(candidate, null, 2)}\n`;
    const findings = inspectIssue(options.date, review, candidate);
    if (previousReport) {
        previousReport.findings
            .filter((finding) => finding.code === "source-fetch-failures" ||
            finding.code === "translation-failures" ||
            finding.code.startsWith("coverage-"))
            .forEach((finding) => {
            if (!findings.some((item) => item.code === finding.code)) {
                findings.push(finding);
            }
        });
    }
    const blockers = findings.filter((finding) => finding.level === "blocker").length;
    const warnings = findings.filter((finding) => finding.level === "warning").length;
    const report = {
        version: 1,
        date: options.date,
        generatedAt: new Date().toISOString(),
        status: blockers ? "blocked" : warnings ? "review" : "ready",
        reviewMode: options.recheckInput ? "edited-recheck" : "generated",
        candidateSha256: sha256(candidateText),
        counts: {
            cards: candidate.issue.cards.length,
            pages: candidate.issue.pageCount,
            rawItems: review.meta?.rawItemCount ?? 0,
            freshCandidates: review.meta?.freshCandidateCount ?? 0,
            publishableCards: review.meta?.publishableCardCount ?? 0,
            reviewableCards: review.meta?.reviewableCardCount ?? 0,
            rejectedCards: review.meta?.rejectedCardCount ?? 0,
            blockers,
            warnings
        },
        findings
    };
    await writeText(options.pendingOutput, candidateText);
    await writeText(options.reportOutput, `${JSON.stringify(report, null, 2)}\n`);
    await writeText(options.summaryOutput, buildMarkdown(report, candidate));
    console.log(JSON.stringify({
        date: report.date,
        status: report.status,
        cards: report.counts.cards,
        blockers,
        warnings,
        pendingOutput: options.pendingOutput,
        summaryOutput: options.summaryOutput,
        reportOutput: options.reportOutput
    }, null, 2));
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
