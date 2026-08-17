"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairCardDraft = repairCardDraft;
const cardDraftQuality_1 = require("./cardDraftQuality");
const textSimilarity_1 = require("./textSimilarity");
const noisyImagePattern = /logo|icon|favicon|search|weibo|weixin|wechat|qrcode|qr-code|erweima|ewm\.png|zxcode|code\.jpg|spacer|blank|nav|share|printer|footer|header|circle|\/gh\./i;
const sentenceEndPattern = /[。！？；.!?;]$/u;
const compact = (value) => value.replace(/\s+/g, " ").trim();
const cloneCard = (card) => ({
    ...card,
    tags: [...card.tags],
    industries: [...card.industries],
    body: { ...card.body },
    sourceLinks: card.sourceLinks.map((sourceLink) => ({ ...sourceLink })),
    images: card.images.map((image) => ({ ...image }))
});
const hasIssue = (report, code) => report.issues.some((issue) => issue.code === code);
const stripFinalPunctuation = (value) => compact(value).replace(/[。！？；.!?;]+$/u, "");
const ensureSentenceEnd = (value) => {
    const normalized = compact(value);
    if (!normalized) {
        return normalized;
    }
    if (sentenceEndPattern.test(normalized)) {
        return normalized;
    }
    return `${normalized.replace(/[，,、：:]+$/u, "")}。`;
};
const removeTrailingEllipsis = (value) => compact(value)
    .replace(/\.{3,}/g, "")
    .replace(/…+/g, "")
    .replace(/[，,、：:]+$/u, "")
    .trim();
const removeLeadingFragment = (value) => compact(value).replace(/^[\s"'“”‘’」』）),，。、；;：:]+/u, "");
const shortenToCompleteSentence = (value, maxLength) => {
    const normalized = removeTrailingEllipsis(value);
    if (normalized.length <= maxLength) {
        return ensureSentenceEnd(normalized);
    }
    const sliced = normalized.slice(0, maxLength).trim();
    const lastEnd = Math.max(sliced.lastIndexOf("。"), sliced.lastIndexOf("！"), sliced.lastIndexOf("？"), sliced.lastIndexOf("；"), sliced.lastIndexOf("."), sliced.lastIndexOf("!"), sliced.lastIndexOf("?"), sliced.lastIndexOf(";"));
    if (lastEnd >= Math.floor(maxLength * 0.5)) {
        return sliced.slice(0, lastEnd + 1).trim();
    }
    return ensureSentenceEnd(sliced.replace(/[，,、：:；;]+$/u, ""));
};
const setTextField = (actions, target, field, value, label) => {
    const before = String(target[field] ?? "");
    const after = compact(value);
    if (after && before !== after) {
        target[field] = after;
        actions.push({
            code: "rewrite-field",
            label,
            field: String(field),
            before,
            after
        });
    }
};
const contextualProgress = (card) => {
    const title = stripFinalPunctuation(card.title);
    const text = `${card.title} ${card.oneLine} ${card.tags.join(" ")}`;
    if (/招聘|招募|人才|就业|人社|岗位|HR|三支一扶/u.test(text)) {
        return `这条信息的核心变化围绕“${title}”展开，后续需要重点确认报名对象、时间节点、岗位条件和地方执行范围。`;
    }
    if (/教师|教育|学校|课堂|课程|学生|高校|中小学/u.test(text)) {
        return `这条信息的核心变化围绕“${title}”展开，后续需要重点确认适用学校、教师或学生范围，以及地方执行节奏。`;
    }
    if (/消费|零售|电商|市场|数据|运营|品牌/u.test(text)) {
        return `这条信息的核心变化围绕“${title}”展开，后续需要重点观察数据是否连续变化，以及对运营、选品和消费判断的影响。`;
    }
    if (/AI|模型|算法|产品|科技|技术|监管/u.test(text)) {
        return `这条信息的核心变化围绕“${title}”展开，后续需要重点关注执行细则、企业响应和对产品发布节奏的影响。`;
    }
    return `这条信息的核心变化围绕“${title}”展开，后续需要重点确认影响范围、执行节点和是否出现更多来源确认。`;
};
const normalizeBodyFragments = (card, actions) => {
    const fields = ["background", "keyProgress"];
    fields.forEach((field) => {
        const current = card.body[field] ?? "";
        const repaired = ensureSentenceEnd(removeLeadingFragment(removeTrailingEllipsis(current)));
        setTextField(actions, card.body, field, repaired, "补齐半截句子");
    });
};
const normalizeTruncatedFields = (card, actions) => {
    setTextField(actions, card, "oneLine", shortenToCompleteSentence(card.oneLine, 160), "去掉摘要截断痕迹");
    setTextField(actions, card.body, "background", shortenToCompleteSentence(card.body.background, 220), "去掉背景截断痕迹");
    setTextField(actions, card.body, "keyProgress", shortenToCompleteSentence(card.body.keyProgress, 260), "去掉进展截断痕迹");
};
const repairShortFields = (card, actions) => {
    if (compact(card.oneLine).length < 24) {
        setTextField(actions, card, "oneLine", ensureSentenceEnd(`这条信息主要围绕${stripFinalPunctuation(card.title)}展开，核心影响需要结合适用范围和时间节点判断`), "补足一句话导读");
    }
    if (compact(card.body.background).length < 32) {
        setTextField(actions, card.body, "background", ensureSentenceEnd(card.oneLine || `这条信息围绕${stripFinalPunctuation(card.title)}展开`), "补足事件背景");
    }
    if (compact(card.body.keyProgress).length < 32) {
        setTextField(actions, card.body, "keyProgress", contextualProgress(card), "补足关键进展");
    }
};
const repairRepetitionOrList = (card, actions) => {
    setTextField(actions, card.body, "keyProgress", contextualProgress(card), "改写关键进展");
};
const repairLeadBackground = (card, detail, actions) => {
    const replacement = detail?.text
        .replace(/\s+/g, " ")
        .split(/(?<=[。！？；])/u)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 36 && sentence.length <= 240)
        .filter((sentence) => (0, textSimilarity_1.textSimilarity)(card.oneLine, sentence) < 0.45)
        .filter((sentence) => (0, textSimilarity_1.textSimilarity)(card.title, sentence) < 0.72)
        .find((sentence) => !/^(一是|二是|三是|四是|五是|第[一二三四五六七八九十]+条)/.test(sentence));
    if (replacement) {
        setTextField(actions, card.body, "background", shortenToCompleteSentence(replacement, 220), "改用与导读不同的背景信息");
        return;
    }
    const officialRisk = card.credibility === "官方来源" && card.tags.some((tag) => ["risk", "disaster", "publicSafety"].includes(tag));
    const location = card.title.match(/在([^开展处置支援]{2,16})(?:开展|处置|支援)/u)?.[1] ??
        card.title.match(/支援([^，。；、]{2,16})/u)?.[1];
    if (officialRisk && location) {
        setTextField(actions, card.body, "background", `官方采取跨地区调派专业力量的方式支援${location}，当地排涝处置仍在持续推进。`, "压缩重复的官方风险背景");
    }
};
const repairTitleLeadOverlap = (card, actions) => {
    setTextField(actions, card, "oneLine", `最新进展：${stripFinalPunctuation(card.title)}。`, "补足导读与标题的事件对应关系");
};
const repairImages = (images, actions) => {
    const filtered = images.filter((image) => !noisyImagePattern.test(image.url));
    if (filtered.length !== images.length) {
        actions.push({
            code: "filter-images",
            label: "移除网页图标或二维码图片",
            before: `${images.length}`,
            after: `${filtered.length}`
        });
    }
    return filtered;
};
function repairCardDraft(card, report, detail) {
    const repairedCard = cloneCard(card);
    const actions = [];
    if (hasIssue(report, "truncated-field") || hasIssue(report, "one-line-too-long")) {
        normalizeTruncatedFields(repairedCard, actions);
    }
    if (hasIssue(report, "sentence-fragment")) {
        normalizeBodyFragments(repairedCard, actions);
    }
    if (hasIssue(report, "list-fragment") || hasIssue(report, "body-repetition")) {
        repairRepetitionOrList(repairedCard, actions);
    }
    if (hasIssue(report, "one-line-too-short") ||
        hasIssue(report, "background-too-short") ||
        hasIssue(report, "key-progress-too-short")) {
        repairShortFields(repairedCard, actions);
    }
    const reportAfterShortFieldRepair = actions.length
        ? (0, cardDraftQuality_1.evaluateCardDraftQuality)(repairedCard, detail)
        : report;
    if (hasIssue(reportAfterShortFieldRepair, "lead-background-repetition")) {
        repairLeadBackground(repairedCard, detail, actions);
    }
    if (hasIssue(reportAfterShortFieldRepair, "title-lead-low-overlap")) {
        repairTitleLeadOverlap(repairedCard, actions);
    }
    if (hasIssue(report, "noisy-image")) {
        repairedCard.images = repairImages(repairedCard.images, actions);
    }
    if (!actions.length) {
        return {
            originalReport: report,
            repairedReport: report,
            card,
            actions,
            changed: false
        };
    }
    const repairedReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(repairedCard, detail);
    if (repairedReport.score < report.score) {
        return {
            originalReport: report,
            repairedReport: report,
            card,
            actions: [
                {
                    code: "repair-skipped",
                    label: "自动修复未采用，避免降低质量分"
                }
            ],
            changed: false
        };
    }
    return {
        originalReport: report,
        repairedReport,
        card: repairedCard,
        actions,
        changed: true
    };
}
