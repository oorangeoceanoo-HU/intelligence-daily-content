"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchXinhuaTechRawItems = exports.fetchXinhuaWorldRawItems = exports.normalizeRawFetchSourceId = void 0;
exports.fetchArxivRawItems = fetchArxivRawItems;
exports.fetchCasScienceRawItems = fetchCasScienceRawItems;
exports.fetchMohurdConstructionRawItems = fetchMohurdConstructionRawItems;
exports.fetchGdacsRawItems = fetchGdacsRawItems;
exports.fetchGovPolicyRawItems = fetchGovPolicyRawItems;
exports.fetchMemRawItems = fetchMemRawItems;
exports.fetchCacRawItems = fetchCacRawItems;
exports.fetchMoeRawItems = fetchMoeRawItems;
exports.fetchChrmRawItems = fetchChrmRawItems;
exports.fetchStatsDataRawItems = fetchStatsDataRawItems;
exports.fetchMofcomConsumptionRawItems = fetchMofcomConsumptionRawItems;
exports.fetchGdeltRawItems = fetchGdeltRawItems;
exports.fetchReliefWebRawItems = fetchReliefWebRawItems;
exports.fetchRawContentSource = fetchRawContentSource;
exports.fetchRawContentSources = fetchRawContentSources;
const sourceRegistry_1 = require("./sourceRegistry");
const userAgent = "intelligence-daily-app/0.1 local-prototype";
const defaultTimeoutMs = 45000;
const sourceAliases = {
    arxiv: "arxiv-cs-api",
    cas: "cas-science-news",
    science: "cas-science-news",
    construction: "mohurd-construction",
    architecture: "mohurd-construction",
    gdacs: "gdacs-feed",
    gov: "gov-cn-policy-library",
    policy: "gov-cn-policy-library",
    mem: "mem-cn",
    emergency: "mem-cn",
    cac: "cac-cn",
    cyberspace: "cac-cn",
    world: "xinhua-world",
    xinhua: "xinhua-world",
    tech: "xinhua-tech",
    education: "moe-cn",
    moe: "moe-cn",
    hr: "chrm-mohrss",
    chrm: "chrm-mohrss",
    stats: "stats-cn-data",
    nbs: "stats-cn-data",
    operations: "stats-cn-data",
    consumer: "mofcom-consumption",
    consumption: "mofcom-consumption",
    mofcom: "mofcom-consumption",
    gdelt: "gdelt-doc-api",
    reliefweb: "reliefweb-api",
    "arxiv-cs-api": "arxiv-cs-api",
    "cas-science-news": "cas-science-news",
    "mohurd-construction": "mohurd-construction",
    "gdacs-feed": "gdacs-feed",
    "gov-cn-policy-library": "gov-cn-policy-library",
    "mem-cn": "mem-cn",
    "cac-cn": "cac-cn",
    "xinhua-world": "xinhua-world",
    "xinhua-tech": "xinhua-tech",
    "moe-cn": "moe-cn",
    "chrm-mohrss": "chrm-mohrss",
    "stats-cn-data": "stats-cn-data",
    "mofcom-consumption": "mofcom-consumption",
    "gdelt-doc-api": "gdelt-doc-api",
    "reliefweb-api": "reliefweb-api"
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const decodeXmlEntities = (value) => value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
const stripTags = (value) => decodeXmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const tagText = (block, tagName) => {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "i");
    const match = block.match(pattern);
    return match ? stripTags(match[1]) : undefined;
};
const tagRawText = (block, tagName) => {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "i");
    const match = block.match(pattern);
    return match ? decodeXmlEntities(match[1]).replace(/\s+/g, " ").trim() : undefined;
};
const blocksByTag = (xml, tagName) => {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${escapeRegExp(tagName)}>`, "gi");
    return xml.replace(/^\uFEFF/, "").match(pattern) ?? [];
};
const asIsoDate = (value) => {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toISOString();
};
const compactText = (value, maxLength = 600) => {
    if (!value) {
        return undefined;
    }
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength).trim()}...`;
};
const sourceName = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.name ?? sourceId;
const sourceUrl = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.url ?? "";
const stableHash = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};
const makeId = (sourceId, value, index) => `${sourceId}-${stableHash(`${value}-${index}`)}`;
const fetchText = async (url, timeoutMs = defaultTimeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json, application/atom+xml, application/rss+xml, text/xml, */*",
                "User-Agent": userAgent
            },
            signal: controller.signal
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${compactText(text, 160) ?? response.statusText}`);
        }
        return text;
    }
    finally {
        clearTimeout(timeoutId);
    }
};
const fetchTextWithLegacyTls = async (url, timeoutMs = defaultTimeoutMs) => new Promise((resolve, reject) => {
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
            "Accept": "text/html,application/xhtml+xml,*/*",
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
                reject(new Error(`HTTP ${response.statusCode}: ${compactText(text, 160) ?? "legacy TLS request failed"}`));
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
const absoluteUrl = (href, baseUrl) => {
    try {
        return new URL(href, baseUrl).toString();
    }
    catch {
        return undefined;
    }
};
const htmlLinks = (html, baseUrl) => {
    const links = [];
    const pattern = /<a\s+[^>]*href=["'](?<href>[^"']+)["'][^>]*>(?<text>[\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(html))) {
        const href = match.groups?.href ?? "";
        const title = stripTags(match.groups?.text ?? "");
        const url = absoluteUrl(href, baseUrl);
        if (!url || !title || href.startsWith("javascript:")) {
            continue;
        }
        links.push({ title, url });
    }
    return links;
};
const dateFromMoeUrl = (url) => {
    const match = url.match(/t(\d{4})(\d{2})(\d{2})_/);
    if (!match) {
        return undefined;
    }
    return `${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`;
};
const dateFromChineseListText = (value) => {
    const match = value.match(/(20\d{2})-(\d{2})-(\d{2})/);
    if (!match) {
        return undefined;
    }
    return `${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`;
};
const dateFromCompactUrl = (url) => {
    const match = url.match(/\/(20\d{2})(\d{2})(\d{2})(?:\/|_)/);
    if (!match) {
        return undefined;
    }
    return `${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`;
};
const uniqueByUrl = (items) => {
    const seen = new Set();
    const result = [];
    items.forEach((item) => {
        const key = item.url.split("#")[0].trim().replace(/\/$/, "").toLowerCase();
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        result.push(item);
    });
    return result;
};
const cleanMofcomTitle = (value) => {
    const title = value.replace(/\s+/g, " ").trim();
    const teaserStart = title.search(/\s+(?:\d{1,2}月\d{1,2}日[，,]|近日[，,]|日前[，,]|为深入|为贯彻|为落实)/);
    if (teaserStart > 8) {
        return title.slice(0, teaserStart).trim();
    }
    return title;
};
const cleanChrmTitle = (value) => value
    .replace(/^([^\s]{2,12})\s+\1\s*/, "$1")
    .replace(/\s+20\d{2}-\d{2}-\d{2}.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
const normalizeRawFetchSourceId = (value) => sourceAliases[value.toLowerCase()];
exports.normalizeRawFetchSourceId = normalizeRawFetchSourceId;
async function fetchArxivRawItems(limit) {
    const sourceId = "arxiv-cs-api";
    const params = new URLSearchParams({
        search_query: "(cat:cs.AI OR cat:cs.NI OR cat:eess.SP OR cat:eess.SY)",
        sortBy: "submittedDate",
        sortOrder: "descending",
        max_results: String(limit)
    });
    const xml = await fetchText(`${sourceUrl(sourceId)}?${params.toString()}`);
    const fetchedAt = new Date().toISOString();
    return blocksByTag(xml, "entry").slice(0, limit).map((entry, index) => {
        const title = tagText(entry, "title") ?? "Untitled arXiv item";
        const id = tagText(entry, "id") ?? "";
        const url = id || `https://arxiv.org/search/?query=${encodeURIComponent(title)}&searchtype=all`;
        const summary = tagText(entry, "summary");
        return {
            id: makeId(sourceId, url || title, index),
            sourceId,
            title,
            url,
            publishedAt: asIsoDate(tagText(entry, "published")),
            updatedAt: asIsoDate(tagText(entry, "updated")),
            language: "en",
            summaryFromSource: compactText(summary),
            rawText: summary,
            author: blocksByTag(entry, "author")
                .map((authorBlock) => tagText(authorBlock, "name"))
                .filter((name) => Boolean(name))
                .slice(0, 4)
                .join(", "),
            imageUrls: [],
            fetchedAt
        };
    });
}
async function fetchCasScienceRawItems(limit) {
    const sourceId = "cas-science-news";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /\/20\d{4}\/t20\d{6}_\d+\.shtml$/.test(link.url))
        .filter((link) => /研究|科研|科学家|技术|成果|论文|通信|网络|材料|机器人|人工智能|能源/.test(link.title))).slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromMoeUrl(link.url),
        language: "zh",
        summaryFromSource: "中国科学院科研动态，用于科研突破、论文线索和技术研究进展。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchMohurdConstructionRawItems(limit) {
    const sourceId = "mohurd-construction";
    const listUrl = sourceUrl(sourceId);
    const apiUrl = new URL("/api-gateway/jpaas-publish-server/front/page/build/unit", listUrl);
    apiUrl.search = new URLSearchParams({
        parseType: "bulidstatic",
        webId: "86ca573ec4df405db627fdc2493677f3",
        tplSetId: "fc259c381af3496d85e61997ea7771cb",
        pageType: "column",
        tagId: "栏目-list",
        editType: "null",
        pageId: "919e942639b5477d96e4c97471c61d9f"
    }).toString();
    const responseText = await fetchText(apiUrl.toString());
    const response = JSON.parse(responseText);
    const html = response.data?.html ?? "";
    const fetchedAt = new Date().toISOString();
    const datedLinks = [...html.matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href=["'](?<href>[^"']+)["'][^>]*>(?<title>[\s\S]*?)<\/a>[\s\S]*?<span\b[^>]*class=["'][^"']*date-info[^"']*["'][^>]*>(?<date>20\d{2}-\d{2}-\d{2})<\/span>[\s\S]*?<\/li>/gi)]
        .map((match) => ({
        title: stripTags(match.groups?.title ?? ""),
        url: absoluteUrl(match.groups?.href ?? "", listUrl) ?? listUrl,
        date: match.groups?.date
    }))
        .filter((link) => /建筑|住房|城市|城乡|更新|工程|建设|绿色|规划|物业|公积金/.test(link.title))
        .slice(0, limit);
    return datedLinks.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: link.date ? `${link.date}T00:00:00+08:00` : undefined,
        language: "zh",
        summaryFromSource: "住房和城乡建设部动态，用于建筑、住房、城市更新和城乡建设信息。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchGdacsRawItems(limit) {
    const sourceId = "gdacs-feed";
    const xml = await fetchText(sourceUrl(sourceId));
    const fetchedAt = new Date().toISOString();
    return blocksByTag(xml, "item").slice(0, limit).map((item, index) => {
        const title = tagText(item, "title") ?? "Untitled GDACS alert";
        const link = tagText(item, "link") ?? sourceUrl(sourceId);
        const description = tagRawText(item, "description");
        return {
            id: makeId(sourceId, link || title, index),
            sourceId,
            title,
            url: link,
            publishedAt: asIsoDate(tagText(item, "pubDate")),
            updatedAt: asIsoDate(tagText(item, "gdacs:fromdate")),
            language: "en",
            summaryFromSource: compactText(stripTags(description ?? "")),
            rawText: stripTags(description ?? ""),
            imageUrls: [],
            fetchedAt
        };
    });
}
async function fetchGovPolicyRawItems(limit) {
    const sourceId = "gov-cn-policy-library";
    const listUrl = `${sourceUrl(sourceId).replace(/\/$/, "")}/ZUIXINZHENGCE.json`;
    const text = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const items = JSON.parse(text);
    return items
        .filter((item) => item.TITLE && item.URL)
        .filter((item) => /人工智能|数据|网络|知识产权|集成电路|就业|社保|教育|消费|税|金融|医疗|住房|出境|入境|科技|产业|外贸|营商|平台|个人信息|应急|交通|养老|生育|社会工作/.test(item.TITLE ?? ""))
        .slice(0, limit)
        .map((item, index) => ({
        id: makeId(sourceId, item.URL ?? item.TITLE ?? "", index),
        sourceId,
        title: item.TITLE ?? "国务院最新政策",
        url: item.URL ?? sourceUrl(sourceId),
        publishedAt: item.DOCRELPUBTIME ? `${item.DOCRELPUBTIME}T00:00:00+08:00` : undefined,
        language: "zh",
        summaryFromSource: item.SUB_TITLE || "中国政府网最新政策候选。",
        rawText: `${item.TITLE ?? ""} ${item.SUB_TITLE ?? ""}`.trim(),
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchMemRawItems(limit) {
    const sourceId = "mem-cn";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /\/xw\/yjglbgzdt\/20\d{4}\/t20\d{6}_\d+\.shtml$/.test(link.url))
        .filter((link) => /响应|台风|洪涝|地震|救灾|预警|风险|应急|安全生产|暴雨|泥石流|山洪|抗旱|地质灾害|防汛/.test(link.title))
        .filter((link) => !/奖励|典型案例|先进事迹/.test(link.title))).slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title.replace(/\s+20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}.*$/, "").trim(),
        url: link.url,
        publishedAt: dateFromMoeUrl(link.url) ?? dateFromChineseListText(link.title),
        language: "zh",
        summaryFromSource: "应急管理部工作动态候选，用于国内灾害、预警和公共安全提醒。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchCacRawItems(limit) {
    const sourceId = "cac-cn";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /www\.cac\.gov\.cn\/20\d{2}-\d{2}\/\d{2}\/c_\d+\.htm$/.test(link.url))
        .filter((link) => /人工智能|算法|数据|网络|应用程序|个人信息|平台|互联网|网暴|未成年人|生成式|深度合成|网络安全|征求意见|规定|管理办法|国家标准/.test(link.title))).slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromCompactUrl(link.url),
        language: "zh",
        summaryFromSource: "国家网信办政策候选，用于 AI、数据、平台治理和网络安全政策变化。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
const fetchXinhuaListRawItems = async (sourceId, limit, keywordPattern) => {
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const section = sourceId === "xinhua-world" ? "world" : "tech";
    const sourceLinks = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => new RegExp(`/(${section}/)?20\\d{6}/[a-z0-9]+/c\\.html$`, "i").test(link.url))
        .filter((link) => keywordPattern.test(link.title))
        .filter((link) => sourceId !== "xinhua-tech" || !/组图|图片故事/.test(link.title)));
    const priority = (title) => {
        if (sourceId === "xinhua-world") {
            if (/死亡|受伤|\d+死|\d+伤|地震|强震|战争|冲突升级|爆炸|核|霍尔木兹|油价/.test(title))
                return 5;
            if (/停火|制裁|关税|军事|防务|危机|袭击/.test(title))
                return 4;
            if (/政府|议会|法案|选举|预算|外交|承认/.test(title))
                return 3;
            return 1;
        }
        if (/突破|首次|发布|商业化|量产|调用版图/.test(title))
            return 5;
        if (/AI|人工智能|大模型|机器人|芯片|6G|量子|脑机|自动驾驶/.test(title))
            return 4;
        return 2;
    };
    const links = sourceLinks
        .sort((a, b) => {
        const priorityDiff = priority(b.title) - priority(a.title);
        if (priorityDiff !== 0)
            return priorityDiff;
        return (dateFromCompactUrl(b.url) ?? "").localeCompare(dateFromCompactUrl(a.url) ?? "");
    })
        .slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromCompactUrl(link.url),
        language: "zh",
        summaryFromSource: sourceId === "xinhua-world"
            ? "新华网国际新闻候选，用于国际局势、外交、冲突、能源和重大公共事件。"
            : "新华网科技新闻候选，用于 AI、机器人、芯片、科研和科技产业变化。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
};
const fetchXinhuaWorldRawItems = (limit) => fetchXinhuaListRawItems("xinhua-world", limit, /战争|冲突|停火|和平|制裁|关税|总统|政府|议会|军事|袭击|地震|强震|\d+死|\d+伤|死亡|受伤|油价|海峡|外交|选举|核|台风|洪水|干旱|预算|法案|危机|爆炸|防务|承认/);
exports.fetchXinhuaWorldRawItems = fetchXinhuaWorldRawItems;
const fetchXinhuaTechRawItems = (limit) => fetchXinhuaListRawItems("xinhua-tech", limit, /AI|人工智能|大模型|模型|机器人|自动驾驶|芯片|6G|量子|脑机|视频|产品|技术|科研|研发|应用|数据|电池|新药|具身智能/);
exports.fetchXinhuaTechRawItems = fetchXinhuaTechRawItems;
async function fetchMoeRawItems(limit) {
    const sourceId = "moe-cn";
    const listUrl = "https://www.moe.gov.cn/jyb_xwfb/s5147/";
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = htmlLinks(html, listUrl)
        .filter((link) => /\/jyb_xwfb\/s5147\/20\d{4}\/t20\d{6}_\d+\.html$/.test(link.url))
        .filter((link) => /教育|课堂|学校|教师|学生|高校|毕业生|职教|未成年人|专业|志愿|助学|基础教育|科学课/.test(link.title))
        .slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromMoeUrl(link.url),
        language: "zh",
        summaryFromSource: "教育部新闻发布与媒体报道候选，用于教育政策、教师、学校和高校毕业生相关动态发现。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchChrmRawItems(limit) {
    const sourceId = "chrm-mohrss";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchTextWithLegacyTls(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = htmlLinks(html, listUrl)
        .filter((link) => link.url.includes("/announcement/") && /20\d{2}-\d{2}-\d{2}/.test(link.title))
        .slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: cleanChrmTitle(link.title),
        url: link.url,
        publishedAt: dateFromChineseListText(link.title),
        language: "zh",
        summaryFromSource: "中国人力资源市场网公告候选，用于招聘、就业服务、人才目录和高校毕业生相关动态发现。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchStatsDataRawItems(limit) {
    const sourceId = "stats-cn-data";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /\/sj\/zxfb\/20\d{4}\/t20\d{6}_\d+\.html$/.test(link.url))
        .filter((link) => /消费|零售|价格|采购经理|PMI|服务业|文化|工业|企业|利润|生产资料|市场|经济|数据|就业/.test(link.title))).slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromMoeUrl(link.url),
        language: "zh",
        summaryFromSource: "国家统计局数据发布候选，用于消费、价格、PMI、行业运行和企业经营相关动态发现。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchMofcomConsumptionRawItems(limit) {
    const sourceId = "mofcom-consumption";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /\/(gzdt|gztz|zcfg)\/art\/20\d{2}\/art_[^/]+\.html$/.test(link.url))
        .filter((link) => /消费|市场|零售|电商|电子商务|汽车|流通|发票|健康消费|以旧换新|服务消费|餐饮|商贸|首发|购物|精品|生活必需品/.test(link.title))).slice(0, limit);
    return links.map((link, index) => {
        const title = cleanMofcomTitle(link.title);
        return {
            id: makeId(sourceId, link.url, index),
            sourceId,
            title,
            url: link.url,
            publishedAt: dateFromMoeUrl(link.url),
            language: "zh",
            summaryFromSource: "商务部市场运行和消费促进候选，用于消费促进、市场运行、流通、电商和服务消费相关动态发现。",
            rawText: title,
            imageUrls: [],
            fetchedAt
        };
    });
}
async function fetchGdeltRawItems(limit, query = "\"artificial intelligence\"") {
    const sourceId = "gdelt-doc-api";
    const params = new URLSearchParams({
        query,
        mode: "ArtList",
        format: "json",
        maxrecords: String(limit),
        sort: "datedesc"
    });
    const text = await fetchText(`${sourceUrl(sourceId)}?${params.toString()}`);
    const fetchedAt = new Date().toISOString();
    if (!text.trim().startsWith("{")) {
        throw new Error(compactText(text, 180) ?? "GDELT returned a non-JSON response");
    }
    const json = JSON.parse(text);
    return (json.articles ?? []).slice(0, limit).map((article, index) => {
        const title = article.title ?? "Untitled GDELT article";
        const url = article.url ?? sourceUrl(sourceId);
        return {
            id: makeId(sourceId, url || title, index),
            sourceId,
            title,
            url,
            publishedAt: article.seendate,
            language: article.language ?? "multi",
            summaryFromSource: article.domain ? `Source domain: ${article.domain}` : undefined,
            imageUrls: article.socialimage ? [article.socialimage] : [],
            fetchedAt
        };
    });
}
async function fetchReliefWebRawItems(limit) {
    const sourceId = "reliefweb-api";
    const params = new URLSearchParams({
        appname: "intelligence-daily-app",
        limit: String(limit),
        preset: "latest",
        profile: "list"
    });
    const text = await fetchText(`${sourceUrl(sourceId)}?${params.toString()}`);
    const fetchedAt = new Date().toISOString();
    const json = JSON.parse(text);
    return (json.data ?? []).slice(0, limit).map((report, index) => {
        const fields = report.fields ?? {};
        const title = fields.title ?? "Untitled ReliefWeb report";
        const url = fields.url ?? `https://reliefweb.int/report/${report.id ?? ""}`;
        return {
            id: makeId(sourceId, report.id ?? url ?? title, index),
            sourceId,
            title,
            url,
            publishedAt: asIsoDate(fields.date?.created),
            updatedAt: asIsoDate(fields.date?.changed),
            language: "multi",
            summaryFromSource: compactText(stripTags(fields.body ?? "")),
            rawText: stripTags(fields.body ?? ""),
            fetchedAt
        };
    });
}
async function fetchRawContentSource(sourceId, limit) {
    const fetchedAt = new Date().toISOString();
    try {
        const fetchers = {
            "arxiv-cs-api": fetchArxivRawItems,
            "cas-science-news": fetchCasScienceRawItems,
            "mohurd-construction": fetchMohurdConstructionRawItems,
            "gdacs-feed": fetchGdacsRawItems,
            "gov-cn-policy-library": fetchGovPolicyRawItems,
            "mem-cn": fetchMemRawItems,
            "cac-cn": fetchCacRawItems,
            "xinhua-world": exports.fetchXinhuaWorldRawItems,
            "xinhua-tech": exports.fetchXinhuaTechRawItems,
            "moe-cn": fetchMoeRawItems,
            "chrm-mohrss": fetchChrmRawItems,
            "stats-cn-data": fetchStatsDataRawItems,
            "mofcom-consumption": fetchMofcomConsumptionRawItems,
            "gdelt-doc-api": fetchGdeltRawItems,
            "reliefweb-api": fetchReliefWebRawItems
        };
        const items = await fetchers[sourceId](limit);
        return {
            sourceId,
            sourceName: sourceName(sourceId),
            ok: true,
            fetchedAt,
            items
        };
    }
    catch (error) {
        return {
            sourceId,
            sourceName: sourceName(sourceId),
            ok: false,
            fetchedAt,
            items: [],
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function fetchRawContentSources(sourceIds, limit) {
    const results = [];
    for (const sourceId of sourceIds) {
        results.push(await fetchRawContentSource(sourceId, limit));
    }
    return results;
}
