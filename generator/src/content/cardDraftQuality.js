"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCardDraftQuality = evaluateCardDraftQuality;
const textSimilarity_1 = require("./textSimilarity");
const qualityLabels = {
    ready: "可发布草稿",
    review: "待复核",
    blocked: "暂不发布"
};
const compact = (value) => value.replace(/\s+/g, " ").trim();
const fieldLength = (value) => compact(value ?? "").length;
const textOfCard = (card) => [
    card.title,
    card.oneLine,
    card.body.background,
    card.body.keyProgress,
    card.body.whyItMatters,
    card.body.userRelevance,
    card.body.whatToWatch
]
    .filter((value) => Boolean(value))
    .join("\n");
const addIssue = (issues, severity, code, message) => {
    issues.push({ severity, code, message });
};
const obviousNoisePattern = /Languages|登录|注册|个人登录|法人登录|首页\s+首页|当前位置\s*[:：]?\s*首页|时政要闻\s+应急要闻|政府信息公开\s+通知公告|政务服务|网站主办|网站承办|中华人民共和国中央人民政府|网站标识码|ICP备|责任编辑|打印本页|关闭窗口|上一篇|下一篇|分享到|扫一扫|版权所有|浏览次数|字号|字体：|&emsp;|&ensp;/i;
const tableNoisePattern = /附表|规格说明表|螺纹钢|普通中板|热轧普通板卷|无缝钢管|烧碱|聚乙烯|冰醋酸|顺丁胶|涤纶长丝|液化天然气|液化石油气|Φ|HRB|Q235|NaOH|SCRWF|HPB|P\.O|KPa|熔融指数/;
const noisyImagePattern = /logo|icon|favicon|search|weibo|weixin|wechat|qrcode|qr-code|erweima|ewm\.png|zxcode|code\.jpg|spacer|blank|nav|share|printer|footer|header|circle|\/gh\./i;
const internalProductLanguagePattern = /用户画像|进入日报|是否进入|提高排序|降低展示频率|适合推给|决定是否展示|正式发布前|候选池|用户城市|关注强度|系统会/u;
const countMatches = (value, pattern) => value.match(pattern)?.length ?? 0;
const isMostlyUntranslatedEnglish = (value) => {
    const latinLetters = countMatches(value, /[A-Za-z]/g);
    const cjkChars = countMatches(value, /[\u4e00-\u9fff]/g);
    return latinLetters >= 120 && latinLetters > cjkChars * 1.4;
};
const scoreFromIssues = (issues) => Math.max(0, 100 -
    issues.reduce((sum, issue) => sum + (issue.severity === "error" ? 30 : 10), 0));
const levelFromIssues = (issues, score) => {
    if (issues.some((issue) => issue.severity === "error") || score < 70) {
        return "blocked";
    }
    if (issues.length > 0 || score < 90) {
        return "review";
    }
    return "ready";
};
function evaluateCardDraftQuality(card, detail) {
    const issues = [];
    const cardText = textOfCard(card);
    if (!card.sourceLinks.length || !card.sourceLinks[0]?.url) {
        addIssue(issues, "error", "missing-source-link", "缺少原文链接，不能进入正式日报。");
    }
    if (!detail) {
        addIssue(issues, "warning", "missing-detail", "没有找到正文抓取记录，需要复核。");
    }
    else {
        if (detail.status === "failed") {
            addIssue(issues, "error", "detail-fetch-failed", "原文正文抓取失败，只能回退到候选摘要。");
        }
        if (detail.status === "fallback") {
            addIssue(issues, "warning", "detail-fallback", "没有抓到完整正文，目前使用候选摘要回退。");
        }
        if (detail.charCount < 220) {
            addIssue(issues, "error", "detail-too-short", "原文可用正文过短，可能无法生成可靠卡片。");
        }
        else if (detail.charCount < 320) {
            addIssue(issues, "warning", "detail-limited", "原文信息量有限，需要确认是否足以支持卡片结论。");
        }
        else if (detail.charCount < 500 && !["官方来源", "主流媒体"].includes(card.credibility)) {
            addIssue(issues, "warning", "detail-limited-unverified", "原文篇幅较短且不是官方或主流来源，需要发布前复核。");
        }
    }
    if (fieldLength(card.title) < 8) {
        addIssue(issues, "error", "title-too-short", "标题过短，无法说明事件。");
    }
    if (fieldLength(card.title) > 68) {
        addIssue(issues, "warning", "title-too-long", "标题过长，移动端阅读时需要压缩成编辑标题。");
    }
    if (fieldLength(card.oneLine) < 24) {
        addIssue(issues, "warning", "one-line-too-short", "一句话导读偏短，可能没有讲清楚核心事实。");
    }
    if (fieldLength(card.oneLine) > 180) {
        addIssue(issues, "warning", "one-line-too-long", "一句话导读偏长，详情页顶部可能显得拥挤。");
    }
    if (fieldLength(card.body.background) < 32) {
        addIssue(issues, "error", "background-too-short", "事件背景太短，需要补足基本事实。");
    }
    if (fieldLength(card.body.keyProgress) < 32) {
        addIssue(issues, "error", "key-progress-too-short", "关键进展太短，需要补足具体变化。");
    }
    if (fieldLength(card.body.whyItMatters) < 36) {
        addIssue(issues, "error", "why-too-short", "缺少足够的“为什么重要”说明。");
    }
    if ((0, textSimilarity_1.textSimilarity)(card.oneLine, card.body.background) > 0.64) {
        addIssue(issues, "warning", "lead-background-repetition", "一句话导读和事件背景重复度偏高，需要补充不同的上下文。");
    }
    if ((0, textSimilarity_1.textSimilarity)(card.body.background, card.body.keyProgress) > 0.82) {
        addIssue(issues, "warning", "body-repetition", "事件背景和关键进展重复度偏高，建议压缩或改写。");
    }
    if ([card.oneLine, card.body.background, card.body.keyProgress].some((field) => field.includes("..."))) {
        addIssue(issues, "warning", "truncated-field", "卡片中存在省略号截断痕迹，正式发布前建议改写成完整句子。");
    }
    if ([card.oneLine, card.body.background, card.body.keyProgress].some(isMostlyUntranslatedEnglish)) {
        addIssue(issues, "error", "english-not-translated", "英文来源尚未生成完整中文摘要，不能进入正式日报。");
    }
    if (/^[”’」』）)、；，。]/.test(compact(card.body.background)) || /^[”’」』）)、；，。]/.test(compact(card.body.keyProgress))) {
        addIssue(issues, "warning", "sentence-fragment", "正文段落像是从半句话开始，需要复核是否截取完整。");
    }
    if (/（[一二三四五六七八九十]+）[^。！？]{8,}；（[一二三四五六七八九十]+）/.test(card.body.keyProgress)) {
        addIssue(issues, "warning", "list-fragment", "关键进展像是只截到条款片段，需要补充上下文。");
    }
    if (obviousNoisePattern.test(cardText)) {
        addIssue(issues, "error", "obvious-web-noise", "卡片里仍含明显网页导航或站点噪音。");
    }
    if (internalProductLanguagePattern.test(cardText)) {
        addIssue(issues, "error", "internal-product-language", "卡片混入内部筛选或产品设计语言，需要改写为直接面向读者的说明。");
    }
    if (tableNoisePattern.test(card.body.keyProgress) || tableNoisePattern.test(card.body.background)) {
        addIssue(issues, "warning", "table-noise", "卡片里可能混入表格规格或产品清单，需要复核。");
    }
    if (card.images.some((image) => noisyImagePattern.test(image.url))) {
        addIssue(issues, "warning", "noisy-image", "图片列表里可能含网站图标、二维码或导航图。");
    }
    const score = scoreFromIssues(issues);
    const level = levelFromIssues(issues, score);
    return {
        cardId: card.id,
        level,
        label: qualityLabels[level],
        publishable: level === "ready",
        score,
        issues,
        checkedAt: new Date().toISOString()
    };
}
