"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchArticleDetail = fetchArticleDetail;
exports.fetchArticleDetails = fetchArticleDetails;
exports.buildBodyFromArticleDetail = buildBodyFromArticleDetail;
exports.enrichCandidateWithArticleDetail = enrichCandidateWithArticleDetail;
const textSimilarity_1 = require("./textSimilarity");
const userAgent = "intelligence-daily-app/0.1 local-prototype";
const defaultTimeoutMs = 45000;
const compactText = (value, maxLength) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength).trim()}...`;
};
const completeText = (value, maxLength) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    const sliced = normalized.slice(0, maxLength).trim();
    const lastSentenceEnd = Math.max(sliced.lastIndexOf("。"), sliced.lastIndexOf("！"), sliced.lastIndexOf("？"), sliced.lastIndexOf("；"));
    if (lastSentenceEnd >= Math.floor(maxLength * 0.55)) {
        return sliced.slice(0, lastSentenceEnd + 1).trim();
    }
    return `${sliced.replace(/[，,、：:；;]+$/u, "")}。`;
};
const decodeHtmlEntities = (value) => value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&(emsp|ensp|thinsp);/gi, " ")
    .replace(/&nbsp;/g, " ");
const stripTags = (value) => decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
const removeNoisyBlocks = (html) => html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
const absoluteUrl = (value, baseUrl) => {
    try {
        return new URL(value, baseUrl).toString();
    }
    catch {
        return undefined;
    }
};
const normalizeLine = (value) => stripTags(value)
    .replace(/[\u3000\xa0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const isNoiseLine = (line) => {
    if (!line) {
        return true;
    }
    if (line.length < 12) {
        return true;
    }
    return /责任编辑|打印本页|关闭窗口|分享到|扫一扫|ICP备|网站地图|版权所有|上一篇|下一篇|相关链接|字体：|字号|来源：|发布时间：|浏览次数/.test(line);
};
const unique = (items) => Array.from(new Set(items));
const extractParagraphs = (html) => {
    const cleaned = removeNoisyBlocks(html);
    const paragraphMatches = [...cleaned.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
    const paragraphLines = paragraphMatches
        .map((match) => normalizeLine(match[2] ?? ""))
        .filter((line) => !isNoiseLine(line));
    if (paragraphLines.length >= 2) {
        return unique(paragraphLines);
    }
    const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = stripTags(bodyMatch?.[1] ?? cleaned);
    return unique(bodyText
        .split(/\n|(?<=。)|(?<=！)|(?<=？)|(?<=\.)\s+/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter((line) => !isNoiseLine(line)));
};
const sliceFromClassToMarker = (html, className, endMarkers) => {
    const startPattern = new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, "i");
    const startMatch = startPattern.exec(html);
    if (!startMatch) {
        return html;
    }
    const startIndex = startMatch.index + startMatch[0].length;
    const remainder = html.slice(startIndex);
    const endIndexes = endMarkers
        .map((marker) => remainder.search(new RegExp(marker, "i")))
        .filter((index) => index >= 0);
    const endIndex = endIndexes.length ? Math.min(...endIndexes) : remainder.length;
    return remainder.slice(0, endIndex);
};
const sliceFromIdToMarker = (html, id, endMarkers) => {
    const startPattern = new RegExp(`<[^>]+id=["']${id}["'][^>]*>`, "i");
    const startMatch = startPattern.exec(html);
    if (!startMatch) {
        return html;
    }
    const startIndex = startMatch.index + startMatch[0].length;
    const remainder = html.slice(startIndex);
    const endIndexes = endMarkers
        .map((marker) => remainder.search(new RegExp(marker, "i")))
        .filter((index) => index >= 0);
    const endIndex = endIndexes.length ? Math.min(...endIndexes) : remainder.length;
    return remainder.slice(0, endIndex);
};
const articleHtmlForSource = (html, sourceId) => {
    if (sourceId === "mem-cn") {
        return sliceFromClassToMarker(html, "zhenwen_neir", [
            '<div[^>]+class=["\'][^"\']*erweima',
            '<div[^>]+class=["\'][^"\']*zebian'
        ]);
    }
    if (sourceId === "xinhua-world" || sourceId === "xinhua-tech") {
        return sliceFromIdToMarker(html, "detailContent", [
            '<div[^>]+id=["\']articleEdit["\']',
            '<div[^>]+class=["\'][^"\']*relatedNews'
        ]);
    }
    if (sourceId === "cac-cn") {
        return sliceFromClassToMarker(html, "main-content", [
            '<div[^>]+class=["\'][^"\']*zwfenye',
            '<div[^>]+class=["\'][^"\']*footer'
        ]);
    }
    if (sourceId === "gov-cn-policy-library") {
        return sliceFromClassToMarker(html, "trs_editor_view", [
            '<div[^>]+class=["\'][^"\']*pagination',
            '<div[^>]+class=["\'][^"\']*jiedu-blk'
        ]);
    }
    if (sourceId === "chrm-mohrss") {
        return sliceFromClassToMarker(html, "post-content", [
            '<div[^>]+class=["\'][^"\']*post-views',
            '<div[^>]+class=["\'][^"\']*top-sec'
        ]);
    }
    if (sourceId === "cas-science-news") {
        return sliceFromClassToMarker(html, "trs_editor_view", [
            '<div[^>]+class=["\'][^"\']*footer',
            '<div[^>]+class=["\'][^"\']*share'
        ]);
    }
    if (sourceId === "mohurd-construction") {
        return sliceFromClassToMarker(html, "editor-content", [
            '<div[^>]+class=["\'][^"\']*footer',
            '<div[^>]+class=["\'][^"\']*share'
        ]);
    }
    return html;
};
const extractTitle = (html, fallback) => {
    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? normalizeLine(titleMatch[1]) : "";
    return title
        .replace(/[-_].*$/, "")
        .replace(/_.*$/, "")
        .trim() || fallback;
};
const noisyImagePattern = /logo|icon|favicon|search|weibo|weixin|wechat|qrcode|qr-code|erweima|ewm\.png|zxcode|code\.jpg|spacer|blank|nav|share|printer|footer|header|circle|\/gh\./i;
const extractImageUrls = (html, baseUrl, sourceId) => {
    if (["gov-cn-policy-library", "mem-cn", "cac-cn", "chrm-mohrss"].includes(sourceId)) {
        return [];
    }
    const cleaned = removeNoisyBlocks(html);
    const matches = [...cleaned.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
    return unique(matches
        .map((match) => absoluteUrl(match[1] ?? "", baseUrl))
        .filter((url) => Boolean(url))
        .filter((url) => !/^data:/i.test(url))
        .filter((url) => /\.(png|jpe?g|webp)(?:\?|$)/i.test(url))
        .filter((url) => !noisyImagePattern.test(url))).slice(0, 5);
};
const fetchHtml = async (url, timeoutMs = defaultTimeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            headers: {
                Accept: "text/html,application/xhtml+xml,*/*",
                "User-Agent": userAgent
            },
            signal: controller.signal
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${compactText(text, 120)}`);
        }
        return text;
    }
    finally {
        clearTimeout(timeoutId);
    }
};
const fetchHtmlWithLegacyTls = async (url, timeoutMs = defaultTimeoutMs) => new Promise((resolve, reject) => {
    const nodeRequire = typeof require === "function" ? require : undefined;
    if (!nodeRequire) {
        reject(new Error("Legacy TLS fetch is only available in the Node preview runtime"));
        return;
    }
    const https = nodeRequire("node:https");
    const crypto = nodeRequire("node:crypto");
    const { Buffer: NodeBuffer } = nodeRequire("node:buffer");
    const request = https.get(url, {
        headers: {
            Accept: "text/html,application/xhtml+xml,*/*",
            "User-Agent": userAgent
        },
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
            const buffer = NodeBuffer.concat(chunks);
            const text = new TextDecoder("utf-8").decode(buffer);
            if (response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(`HTTP ${response.statusCode}: ${compactText(text, 120)}`));
                return;
            }
            resolve(text);
        });
    });
    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
        request.destroy(new Error("Request timed out"));
    });
});
const fetchSourceHtml = (sourceLink) => sourceLink.sourceId === "chrm-mohrss"
    ? fetchHtmlWithLegacyTls(sourceLink.url)
    : fetchHtml(sourceLink.url);
const fallbackTextForCandidate = (candidate) => [
    candidate.oneLine,
    candidate.body.background,
    candidate.body.keyProgress,
    candidate.body.whyItMatters,
    candidate.body.userRelevance,
    candidate.body.whatToWatch
]
    .filter((item) => Boolean(item))
    .join("\n");
const fallbackDetail = (candidate, sourceLink, status, error) => {
    const text = fallbackTextForCandidate(candidate);
    return {
        candidateId: candidate.id,
        sourceLink,
        status,
        title: candidate.title,
        text,
        imageUrls: candidate.images.map((image) => image.url),
        charCount: text.length,
        fetchedAt: new Date().toISOString(),
        error
    };
};
async function fetchArticleDetail(candidate) {
    const sourceLinks = candidate.sourceLinks.length
        ? candidate.sourceLinks
        : [{ title: candidate.title, url: "", sourceId: candidate.sourceIds[0] ?? "unknown" }];
    let lastError;
    for (const sourceLink of sourceLinks) {
        if (!sourceLink.url) {
            continue;
        }
        try {
            const html = await fetchSourceHtml(sourceLink);
            const articleHtml = articleHtmlForSource(html, sourceLink.sourceId);
            const paragraphs = extractParagraphs(articleHtml);
            const text = paragraphs.join("\n").trim();
            if (text.length < 80) {
                lastError = "正文文本过短，已回退到候选摘要";
                continue;
            }
            return {
                candidateId: candidate.id,
                sourceLink,
                status: "fetched",
                title: extractTitle(html, candidate.title),
                text: compactText(text, 3600),
                imageUrls: extractImageUrls(articleHtml, sourceLink.url, sourceLink.sourceId),
                charCount: text.length,
                fetchedAt: new Date().toISOString()
            };
        }
        catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }
    }
    return fallbackDetail(candidate, sourceLinks[0], lastError ? "failed" : "fallback", lastError);
}
async function fetchArticleDetails(candidates) {
    const details = [];
    for (const candidate of candidates) {
        details.push(await fetchArticleDetail(candidate));
    }
    return details;
}
const splitSentences = (text) => unique(text
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？；!?])\s*/)
    .map((sentence) => sentence
    .replace(/^Languages\s+English\s+.*?(?=近日|日前|据|教育部|新华社|本报|记者|习近平|[一二三四五六七八九十]+、)/, "")
    .replace(/^.*?首页\s+(?=20\d{2}年|为深入|根据|各|一、)/, "")
    .replace(/^20\d{2}年[^。]{0,100}(公告|通知)\s+/, "")
    .replace(/^20\d{2}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}\s+/, "")
    .replace(/^(国家统计局服务业调查中心|中国统计信息服务中心\s+卓创资讯)\s+/, "")
    .replace(/^新华社[^。！？]{0,80}电(?:（记者[^）]{0,80}）)?\s*/, "")
    .replace(/^当前位置[:：]?\s*(?:首页\s*[>＞]\s*)?正文\s*/, "")
    .replace(/^\d{9,}\/\d{4}-\d{5}\s+/, "")
    .replace(/\s+/g, " ")
    .trim())
    .filter((sentence) => sentence.length >= 18)
    .filter((sentence) => !isNoiseLine(sentence))
    .filter((sentence) => !/附表|规格说明表|全文如下|网站标识码|地址:|地址：/.test(sentence))
    .filter((sentence) => !/工业生产者价格主要数据|主要数据.*木材加工/.test(sentence))
    .filter((sentence) => !/螺纹钢|线材|普通中板|热轧普通板卷|无缝钢管|烧碱|聚乙烯|冰醋酸|顺丁胶|涤纶|液化天然气|液化石油气|山西优混|普通硅酸盐水泥|浮法平板玻璃|豆粕|磷肥|钾肥|复合肥|草甘膦|瓦楞纸/.test(sentence))
    .filter((sentence) => !(sentence.length > 260 && /Φ|HRB|Q235|NaOH|SCRWF|HPB|P\.O|KPa|熔融指数/.test(sentence))));
const pickSentences = (sentences, keywords, count) => {
    const picked = sentences.filter((sentence) => keywords.test(sentence));
    const fallback = sentences.filter((sentence) => !picked.includes(sentence));
    return [...picked, ...fallback].slice(0, count);
};
const joinAndCompact = (sentences, maxLength) => completeText(sentences.join(""), maxLength);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const removeTitlePrefix = (sentence, title) => {
    const normalizedTitle = title.replace(/\s+/g, "").trim();
    if (!normalizedTitle || normalizedTitle.length > 90) {
        return sentence;
    }
    const flexibleTitle = normalizedTitle
        .split("")
        .map((character) => escapeRegExp(character))
        .join("\\s*");
    return sentence
        .replace(new RegExp(`^${flexibleTitle}\\s*`, "u"), "")
        .replace(/^[，,。；;：:\-—\s]+/u, "")
        .trim();
};
const editorialTitle = (candidate, detail) => {
    let title = candidate.title.replace(/\s+/g, " ").trim();
    const sourceId = detail.sourceLink.sourceId;
    if (sourceId === "gov-cn-policy-library") {
        const issuedPlan = title.match(/(?:转发|印发)《(.+?)》(?:的通知)?$/u)?.[1];
        if (issuedPlan) {
            title = `${issuedPlan
                .replace(/^中央宣传部、司法部关于开展/u, "")
                .replace(/^关于/u, "")
                .replace(/的通知$/u, "")}发布`;
        }
    }
    if (sourceId === "cac-cn") {
        const consultation = title.match(/关于《(.+?)》公开征求意见/u)?.[1];
        if (consultation) {
            title = `${consultation.replace(/（征求意见稿）$/u, "")}公开征求意见`;
        }
    }
    if (sourceId === "mem-cn" && title.length > 46 && /预拨/.test(title)) {
        const amount = title.match(/预拨\s*([\d.]+亿元)/u)?.[1];
        title = `中央预拨${amount ?? "救灾资金"}支持多地防汛抗旱救灾`;
    }
    if ((sourceId === "xinhua-world" || sourceId === "xinhua-tech") && /^专家谈.*地震/u.test(title)) {
        const eventSentence = splitSentences(detail.text).find((sentence) => /哥伦比亚.*7\.4级地震.*132人死亡/.test(sentence));
        if (eventSentence) {
            title = "哥伦比亚7.4级地震已致132人死亡";
        }
    }
    if (sourceId === "xinhua-world" || sourceId === "xinhua-tech") {
        title = title.replace(/^通讯[｜|]/u, "").trim();
    }
    return title;
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
const hasCategory = (candidate, categories) => candidate.categories.some((category) => categories.includes(category));
const whyTemplate = (candidate) => {
    if (hasCategory(candidate, ["disaster", "publicSafety"])) {
        return "这类信息的价值是帮助你提前识别出行、居住和工作场所风险。最需要关注的是影响地区、持续时间、预警等级和官方避险建议。";
    }
    if (hasCategory(candidate, ["world"])) {
        return "重要国际变化可能通过能源价格、航运、贸易、汇率和市场预期传导到国内。理解局势变化有助于你判断后续风险，而不只停留在事件本身。";
    }
    if (/公积金|住房消费/u.test(candidate.title)) {
        return "住房公积金和住房消费政策会直接影响贷款、购房和居住安排。需要重点看适用人群、办理条件、额度变化和地方执行方式。";
    }
    if (candidate.industries.includes("architectureBuiltEnvironment")) {
        return "建筑与城市更新会改变项目机会、技术标准、公共空间和居住体验。建筑、工程与规划从业者需要重点看适用地区、实施范围和地方配套安排。";
    }
    if (candidate.industries.includes("communicationsResearch") || hasCategory(candidate, ["education", "technology"])) {
        return "这类研究能帮助你判断某个学术或工程方向的新进展是否可靠，以及它是否值得继续跟进论文、实验指标、开源材料或真实应用。";
    }
    if (hasCategory(candidate, ["education"])) {
        return "这类变化可能影响学校治理、教师工作、课程安排和学生发展。教育从业者可以据此提前关注地方执行方式和工作要求。";
    }
    if (hasCategory(candidate, ["hr"])) {
        return "这类信息会影响招聘节奏、人才供给、就业服务和用工判断。对 HR、招聘、求职和关注城市人才政策的人更有参考价值。";
    }
    if (hasCategory(candidate, ["ai", "technology", "product"])) {
        return "这类进展能帮助你判断技术能力是否开始进入真实产品和商业场景，并据此调整产品规划、技术选型、学习重点或职业判断。";
    }
    if (hasCategory(candidate, ["policy"])) {
        return "政策变化可能影响个人办事、出行、公共服务或行业规则。提前了解适用范围和生效时间，可以减少信息滞后带来的判断偏差。";
    }
    if (hasCategory(candidate, ["operations", "consumer", "ecommerce"])) {
        return "消费和经营数据能反映需求、成本与市场节奏的变化。它不一定马上改变日常生活，但会影响选品、定价、投放、库存和内容方向。";
    }
    return "这条信息能帮助你补齐对外部变化的基本认识，并判断它是否会继续影响生活、工作或近期决策。";
};
const userRelevanceTemplate = (candidate) => {
    const industries = candidate.industries
        .filter((industry) => industry !== "generalPublic")
        .slice(0, 4)
        .map((industry) => industryLabels[industry])
        .join("、");
    const locations = candidate.locations.slice(0, 3).join("、");
    if (hasCategory(candidate, ["disaster", "publicSafety"])) {
        if (hasCategory(candidate, ["china", "local"])) {
            return locations
                ? `如果你居住、出行或有家人在${locations}，应及时查看当地预警和交通变化；不在相关地区时，通常无需改变日常安排。`
                : "如果你所在地区出现同类预警，应优先确认当地通知、交通变化和避险要求；其他地区通常无需因此改变日常安排。";
        }
        return "如果你近期计划前往事发地区或与当地有工作、家人联系，需要留意后续预警；没有直接联系时，可把它作为区域风险背景了解。";
    }
    if (hasCategory(candidate, ["world"])) {
        return `即使你不在${locations || "事发地区"}，这类局势也可能通过能源价格、国际航运、贸易成本和市场预期间接影响国内生活与工作判断。`;
    }
    if (/公积金|住房消费/u.test(candidate.title)) {
        return "如果你正在购房、租房或关注住房政策，需要重点核对自己所在城市的办理条件和执行细则；建筑从业者也可把它作为住房市场需求变化的参考。";
    }
    if (candidate.industries.includes("architectureBuiltEnvironment")) {
        return locations
            ? `如果你从事建筑、工程或城市规划，或者居住在${locations}，可以重点关注项目范围、建设标准和公共空间变化。`
            : "如果你从事建筑、工程或城市规划，可以重点关注项目范围、建设标准和城市更新机会；普通居民可留意它对居住环境和公共服务的影响。";
    }
    if (candidate.industries.includes("communicationsResearch")) {
        return "如果你是博士生、通信研究人员或工程师，可以重点查看论文方法、实验条件和指标是否可复现；其他用户无需把单篇研究直接理解为成熟产品。";
    }
    if (hasCategory(candidate, ["education"])) {
        return "如果你从事教师、教育研究或学校管理，可以重点关注具体执行方式、适用对象和地方落地节奏；其他用户无需据此改变日常安排。";
    }
    if (hasCategory(candidate, ["hr"])) {
        return "如果你从事 HR、招聘或求职相关工作，可以重点关注岗位要求、人才供给和地方执行安排；其他用户可把它作为就业环境背景了解。";
    }
    if (hasCategory(candidate, ["ai", "technology", "product"])) {
        return industries
            ? `如果你从事${industries}，可以重点判断这项变化是否已经具备产品落地、技术选型或业务合作价值。`
            : "如果你的工作涉及产品或技术，可以重点判断这项变化是否已经具备落地和业务合作价值。";
    }
    if (hasCategory(candidate, ["policy"]) && hasCategory(candidate, ["china"])) {
        return industries
            ? `作为中国居民，你需要留意它是否改变办事、出行或公共服务规则；如果你从事${industries}，还应关注行业执行细则。`
            : "作为中国居民，你需要留意它是否改变办事、出行、公共服务或个人权利义务，并关注正式生效时间。";
    }
    if (hasCategory(candidate, ["operations", "consumer", "ecommerce", "finance"])) {
        return industries
            ? `如果你从事${industries}，这些数据可用于观察需求和成本变化，并辅助定价、选品、投放或经营节奏判断。`
            : "这些数据可用于观察需求和成本变化，并辅助近期消费或经营判断。";
    }
    if (locations && industries) {
        return `如果你的生活或工作与${locations}、${industries}有关，这条变化可能影响近期安排和判断，值得继续观察后续落地。`;
    }
    if (locations) {
        return `如果你居住、出行或有家人在${locations}，可以关注后续是否出现更具体的本地影响和行动建议。`;
    }
    if (industries) {
        return `如果你从事${industries}，这条变化可以作为近期工作和行业判断的一项参考。`;
    }
    return "它与你的直接关系取决于后续影响范围；目前可以先用来补齐背景，不必立即调整个人安排。";
};
const whatToWatchTemplate = (candidate) => {
    if (hasCategory(candidate, ["operations", "consumer", "ecommerce", "finance"])) {
        return "后续重点看是否出现更细的城市、行业、平台或企业动作，以及数据是否连续变化。";
    }
    if (hasCategory(candidate, ["education", "hr", "policy"])) {
        return "后续重点看是否有执行细则、地方落地安排、时间节点或适用人群说明。";
    }
    if (hasCategory(candidate, ["disaster", "publicSafety"])) {
        return "后续重点看影响范围是否扩大、预警等级是否变化，以及是否出现与你所在城市相关的提醒。";
    }
    return "后续重点看是否有更多来源确认，以及这件事是否从单点消息发展成持续趋势。";
};
const oneLineFromDetail = (candidate, sentences) => {
    const cleanedSentences = sentences
        .map((sentence) => removeTitlePrefix(sentence, candidate.title))
        .filter((sentence) => sentence.length >= 18);
    const distinctSentences = cleanedSentences.filter((sentence) => !sentence.includes(candidate.title) && (0, textSimilarity_1.textSimilarity)(candidate.title, sentence) < 0.72);
    const policyLead = hasCategory(candidate, ["policy"])
        ? distinctSentences.find((sentence) => /自20\d{2}年[^。]{0,80}施行/.test(sentence)) ??
            distinctSentences.find((sentence) => /公开征求意见|征求意见截止/.test(sentence)) ??
            distinctSentences.find((sentence) => /到20\d{2}年|主要目标/.test(sentence)) ??
            distinctSentences.find((sentence) => /明确|提出|要求/.test(sentence))
        : undefined;
    const statisticsSentences = hasCategory(candidate, ["operations", "consumer", "finance"])
        ? cleanedSentences.filter((sentence) => /全国.*(?:同比|环比).*(?:上涨|下降|增长)|(?:CPI|PPI|采购经理指数).*同比|环比/.test(sentence) &&
            !/^(其中|生活资料|生产资料)/.test(sentence))
        : [];
    const statisticsLead = statisticsSentences.length
        ? statisticsSentences.slice(0, 2).join("")
        : undefined;
    const riskLead = hasCategory(candidate, ["disaster", "publicSafety"])
        ? distinctSentences.find((sentence) => /启动.*应急响应|预拨.*救灾资金|发布.*预警/.test(sentence))
        : undefined;
    const technologyLead = hasCategory(candidate, ["ai", "technology", "product"])
        ? distinctSentences.find((sentence) => /获得.*许可|启动商业化运营|成功研制|正式发布|正式上线|实现量产|取得突破/.test(sentence) &&
            sentence.length >= 24)
        : undefined;
    const firstDistinct = distinctSentences[0];
    const firstTechSentenceIsWeak = Boolean(firstDistinct && (/气温|天气|街头|中午室外|走进/.test(firstDistinct) || firstDistinct.length < 28));
    const firstUseful = policyLead ??
        statisticsLead ??
        riskLead ??
        (firstTechSentenceIsWeak ? technologyLead : undefined) ??
        firstDistinct ??
        technologyLead ??
        cleanedSentences[0];
    if (firstUseful) {
        let lead = completeText(firstUseful, 150).replace(/^第[一二三四五六七八九十百]+条\s*/u, "");
        const opinionIndex = lead.lastIndexOf("《意见》");
        if (opinionIndex > 0) {
            lead = lead.slice(opinionIndex);
        }
        if (technologyLead === firstUseful && /^(今年|目前|当地)/.test(lead)) {
            lead = `${candidate.title.replace(/^通讯[｜|]/u, "")}：${lead}`;
        }
        if (hasCategory(candidate, ["policy"]) && lead.length < 28) {
            if (lead.startsWith("《意见》")) {
                const shortPolicyName = candidate.title.match(/《(.+?)》/u)?.[1] ?? candidate.title.replace(/发布$/u, "");
                lead = `《${shortPolicyName}》${lead.replace(/^《意见》/u, "")}`;
            }
            else {
                lead = `《${candidate.title}》${lead.replace(/^本规定/u, "")}`;
            }
        }
        if (hasCategory(candidate, ["disaster", "publicSafety"])) {
            return `风险提醒：${lead}`;
        }
        if (hasCategory(candidate, ["policy"])) {
            return `政策变化：${lead}`;
        }
        if (hasCategory(candidate, ["operations", "consumer", "ecommerce", "finance"])) {
            return `经营环境信号：${lead}`;
        }
        if (hasCategory(candidate, ["ai", "technology", "product"])) {
            return `趋势信号：${lead}`;
        }
        return `核心信息：${lead}`;
    }
    return candidate.oneLine;
};
function buildBodyFromArticleDetail(candidate, detail, lead = candidate.oneLine) {
    const sentences = splitSentences(detail.text);
    const leadFacts = new Set(lead.match(/20\d{2}年\d{1,2}月\d{1,2}日|[\d.]+(?:亿元|%|级|人)/g) ?? []);
    const distinctSentences = sentences.filter((sentence) => {
        if ((0, textSimilarity_1.textSimilarity)(lead, sentence) >= 0.55) {
            return false;
        }
        const sentenceFacts = sentence.match(/20\d{2}年\d{1,2}月\d{1,2}日|[\d.]+(?:亿元|%|级|人)/g) ?? [];
        return !sentenceFacts.some((fact) => leadFacts.has(fact));
    });
    const backgroundPool = distinctSentences.filter((sentence) => !/^(一是|二是|三是|四是|五是|第[一二三四五六七八九十]+条)/.test(sentence));
    const backgroundSentences = pickSentences(backgroundPool.length ? backgroundPool : distinctSentences, /背景|此前|是指|不同于|包括|用于|统计范围|调查范围|近日|日前|受|发生|印发|发布|开展|公布|according|announced|reported/i, 1);
    const keyPool = hasCategory(candidate, ["policy"])
        ? distinctSentences.filter((sentence) => sentence.length <= 300 &&
            !/^(坚持以|总体要求|指导思想|[一二三四五六七八九十]+、|（[一二三四五六七八九十]+）)/.test(sentence))
        : distinctSentences;
    const keySentences = pickSentences(keyPool.filter((sentence) => !backgroundSentences.includes(sentence) &&
        (0, textSimilarity_1.textSimilarity)(lead, sentence) < 0.78), /增长|下降|推动|完善|建立|健全|修订|要求|明确|执行|实施|启动|指数|市场|消费|招聘|教师|AI|模型|风险|预警|affected|requires|launched|increased/i, 2);
    const background = joinAndCompact(backgroundSentences, 220);
    const keyProgress = joinAndCompact(keySentences, 260) ||
        compactText(`${candidate.title}。${candidate.body.keyProgress}`, 220);
    return {
        background: background || candidate.body.background,
        keyProgress: keyProgress || candidate.body.keyProgress,
        whyItMatters: whyTemplate(candidate),
        userRelevance: userRelevanceTemplate(candidate),
        whatToWatch: whatToWatchTemplate(candidate)
    };
}
function enrichCandidateWithArticleDetail(candidate, detail) {
    const sentences = splitSentences(detail.text);
    const detailImages = detail.imageUrls.map((url) => ({
        url,
        sourceUrl: detail.sourceLink.url
    }));
    const images = candidate.images.length ? candidate.images : detailImages;
    const oneLine = oneLineFromDetail(candidate, sentences);
    return {
        ...candidate,
        title: editorialTitle(candidate, detail),
        oneLine,
        body: buildBodyFromArticleDetail(candidate, detail, oneLine),
        images
    };
}
