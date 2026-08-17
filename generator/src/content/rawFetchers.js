"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUsefulCityDiscoveryItem = exports.fetchXinhuaTechRawItems = exports.fetchXinhuaWorldRawItems = exports.normalizeRawFetchSourceId = exports.fetchTextWithLegacyTls = void 0;
exports.fetchArxivRawItems = fetchArxivRawItems;
exports.fetchCasScienceRawItems = fetchCasScienceRawItems;
exports.fetchMohurdConstructionRawItems = fetchMohurdConstructionRawItems;
exports.fetchGdacsRawItems = fetchGdacsRawItems;
exports.fetchGovPolicyRawItems = fetchGovPolicyRawItems;
exports.fetchMemRawItems = fetchMemRawItems;
exports.fetchCacRawItems = fetchCacRawItems;
exports.fetchRssRawItems = fetchRssRawItems;
exports.fetchCityNewsRawItems = fetchCityNewsRawItems;
exports.fetchCityContentSource = fetchCityContentSource;
exports.fetchMfaRawItems = fetchMfaRawItems;
exports.fetchMofcomTradeRawItems = fetchMofcomTradeRawItems;
exports.fetchMoeRawItems = fetchMoeRawItems;
exports.fetchChrmRawItems = fetchChrmRawItems;
exports.fetchStatsDataRawItems = fetchStatsDataRawItems;
exports.fetchMofcomConsumptionRawItems = fetchMofcomConsumptionRawItems;
exports.fetchGdeltRawItems = fetchGdeltRawItems;
exports.fetchReliefWebRawItems = fetchReliefWebRawItems;
exports.fetchRawContentSource = fetchRawContentSource;
exports.fetchRawContentSources = fetchRawContentSources;
const sourceRegistry_1 = require("./sourceRegistry");
const citySourceDirectory_1 = require("./citySourceDirectory");
const userAgent = "Mozilla/5.0";
const defaultTimeoutMs = 45000;
const fallbackUsedBySource = new Map();
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const env = (name) => process.env?.[name]?.trim() || undefined;
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
    bbc: "bbc-world-rss",
    "bbc-world": "bbc-world-rss",
    "bbc-business": "bbc-business-rss",
    "bbc-tech": "bbc-technology-rss",
    npr: "npr-world-rss",
    sky: "sky-world-rss",
    "france24-middle-east": "france24-middle-east-rss",
    "france24-asia": "france24-asia-pacific-rss",
    wsj: "wsj-world-rss",
    cnbc: "cnbc-world-rss",
    un: "un-news-rss",
    "un-news": "un-news-rss",
    mfa: "mfa-cn-news",
    foreign: "mfa-cn-news",
    trade: "mofcom-trade",
    openai: "openai-news",
    deepmind: "deepmind-blog",
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
    huggingface: "huggingface-blog",
    "huggingface-blog": "huggingface-blog",
    techcrunch: "techcrunch-ai-rss",
    "techcrunch-ai": "techcrunch-ai-rss",
    "techcrunch-ai-rss": "techcrunch-ai-rss",
    theverge: "theverge-ai-rss",
    "theverge-ai": "theverge-ai-rss",
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
    "bbc-world-rss": "bbc-world-rss",
    "bbc-business-rss": "bbc-business-rss",
    "bbc-technology-rss": "bbc-technology-rss",
    "npr-world-rss": "npr-world-rss",
    "sky-world-rss": "sky-world-rss",
    "france24-middle-east-rss": "france24-middle-east-rss",
    "france24-asia-pacific-rss": "france24-asia-pacific-rss",
    "wsj-world-rss": "wsj-world-rss",
    "cnbc-world-rss": "cnbc-world-rss",
    "un-news-rss": "un-news-rss",
    "mfa-cn-news": "mfa-cn-news",
    "mofcom-trade": "mofcom-trade",
    "openai-news": "openai-news",
    "deepmind-blog": "deepmind-blog",
    "moe-cn": "moe-cn",
    "chrm-mohrss": "chrm-mohrss",
    "stats-cn-data": "stats-cn-data",
    "mofcom-consumption": "mofcom-consumption",
    "theverge-ai-rss": "theverge-ai-rss",
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
const tagAttribute = (block, tagName, attribute) => {
    const pattern = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*\\b${escapeRegExp(attribute)}=["']([^"']+)["'][^>]*>`, "i");
    return pattern.exec(block)?.[1];
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
const sourceName = (sourceId) => {
    const configured = sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.name;
    if (configured) {
        return configured;
    }
    if (sourceId.startsWith("city-news-rss:")) {
        return `城市新闻发现：${decodeURIComponent(sourceId.slice("city-news-rss:".length))}`;
    }
    return sourceId;
};
const sourceUrl = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.url ?? "";
const sourceMethod = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.method ?? (sourceId.startsWith("city-news-rss:") ? "web" : "manual");
const sourceBaseUrl = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.url;
const sourceVerificationStatus = (sourceId) => {
    if (sourceId.startsWith("city-news-rss:")) {
        return "pending";
    }
    return sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.role === "discovery"
        ? "pending"
        : "confirmed";
};
const enrichRawItems = (sourceId, items) => items.map((item) => ({
    ...item,
    sourceMethod: item.sourceMethod ?? sourceMethod(sourceId),
    sourceUrl: item.sourceUrl ?? sourceBaseUrl(sourceId),
    verificationStatus: item.verificationStatus ?? sourceVerificationStatus(sourceId)
}));
const sourceEndpointCandidates = (sourceId) => {
    const config = sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId);
    return Array.from(new Set([config?.url, ...(config?.fallbackUrls ?? [])].filter((value) => Boolean(value))));
};
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
exports.fetchTextWithLegacyTls = fetchTextWithLegacyTls;
const fetchChinesePage = async (url) => {
    try {
        return await fetchText(url);
    }
    catch (firstError) {
        try {
            return await (0, exports.fetchTextWithLegacyTls)(url);
        }
        catch (secondError) {
            const message = (error) => error instanceof Error
                ? `${error.name}: ${error.message || "request failed without a message"}`
                : String(error);
            throw new Error(`${message(firstError)}; legacy TLS fallback: ${message(secondError)}`);
        }
    }
};
const fetchChinesePageCandidates = async (sourceId, urls) => {
    const errors = [];
    fallbackUsedBySource.set(sourceId, false);
    for (let index = 0; index < urls.length; index += 1) {
        try {
            const text = await fetchChinesePage(urls[index]);
            fallbackUsedBySource.set(sourceId, index > 0);
            return { text, url: urls[index] };
        }
        catch (error) {
            errors.push(`${urls[index]}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    throw new Error(errors.join(" | "));
};
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
const dateFromCacUrl = (url) => {
    const match = url.match(/\/(20\d{2})-(\d{2})\/(\d{2})\//);
    return match ? `${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00` : undefined;
};
const dateFromSlashUrl = (url) => {
    const match = url.match(/\/(20\d{2})\/(\d{1,2})\/(\d{1,2})(?:\/|_|\.|$)/);
    if (!match) {
        return undefined;
    }
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T00:00:00+08:00`;
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
    const page = await fetchChinesePageCandidates(sourceId, [apiUrl.toString(), ...sourceEndpointCandidates(sourceId)]);
    let html = page.text;
    try {
        const response = JSON.parse(page.text);
        html = response.data?.html ?? "";
    }
    catch {
        // The official list page is a valid fallback when the publishing API changes.
    }
    const fetchedAt = new Date().toISOString();
    const datedLinks = [...html.matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href=["'](?<href>[^"']+)["'][^>]*>(?<title>[\s\S]*?)<\/a>[\s\S]*?<span\b[^>]*class=["'][^"']*date-info[^"']*["'][^>]*>(?<date>20\d{2}-\d{2}-\d{2})<\/span>[\s\S]*?<\/li>/gi)]
        .map((match) => ({
        title: stripTags(match.groups?.title ?? ""),
        url: absoluteUrl(match.groups?.href ?? "", page.url) ?? page.url,
        date: match.groups?.date
    }))
        .filter((link) => /建筑|住房|城市|城乡|更新|工程|建设|绿色|规划|物业|公积金/.test(link.title))
        .slice(0, limit);
    const fallbackLinks = datedLinks.length ? datedLinks : uniqueByUrl(htmlLinks(html, page.url)
        .filter((link) => /住建|住房|城市|城乡|更新|工程|建设|绿色|规划|物业|公积金/.test(link.title))).slice(0, limit).map((link) => ({
        ...link,
        date: dateFromCompactUrl(link.url) ?? dateFromSlashUrl(link.url)
    }));
    return fallbackLinks.map((link, index) => ({
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
    let xml;
    try {
        xml = await fetchText(sourceUrl(sourceId));
    }
    catch {
        // GDACS occasionally resets Node's native fetch connection while the
        // official feed remains reachable. The direct HTTPS reader uses the same
        // official endpoint and avoids treating that transport failure as an outage.
        xml = await (0, exports.fetchTextWithLegacyTls)(sourceUrl(sourceId));
        fallbackUsedBySource.set(sourceId, true);
    }
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
    const html = await fetchChinesePage(listUrl);
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
    const page = await fetchChinesePageCandidates(sourceId, sourceEndpointCandidates(sourceId));
    const listUrl = page.url;
    const html = page.text;
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /www\.cac\.gov\.cn\/20\d{2}-\d{2}\/\d{2}\/c_\d+\.htm$/.test(link.url))
        .filter((link) => /人工智能|算法|数据|网络|应用程序|个人信息|平台|互联网|网暴|未成年人|生成式|深度合成|网络安全|征求意见|规定|管理办法|国家标准/.test(link.title))).slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromCacUrl(link.url) ?? dateFromCompactUrl(link.url),
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
const rssSourceIds = [
    "bbc-world-rss",
    "bbc-business-rss",
    "bbc-technology-rss",
    "npr-world-rss",
    "sky-world-rss",
    "france24-middle-east-rss",
    "france24-asia-pacific-rss",
    "wsj-world-rss",
    "cnbc-world-rss",
    "un-news-rss",
    "huggingface-blog",
    "techcrunch-ai-rss",
    "theverge-ai-rss",
    "openai-news",
    "deepmind-blog"
];
const rssLanguage = {
    "bbc-world-rss": "en",
    "bbc-business-rss": "en",
    "bbc-technology-rss": "en",
    "npr-world-rss": "en",
    "sky-world-rss": "en",
    "france24-middle-east-rss": "en",
    "france24-asia-pacific-rss": "en",
    "wsj-world-rss": "en",
    "cnbc-world-rss": "en",
    "un-news-rss": "en",
    "huggingface-blog": "en",
    "techcrunch-ai-rss": "en",
    "theverge-ai-rss": "en",
    "openai-news": "en",
    "deepmind-blog": "en"
};
async function fetchRssRawItems(sourceId, limit) {
    let xml;
    try {
        xml = await fetchText(sourceUrl(sourceId));
    }
    catch (error) {
        if (!sourceId.startsWith("bbc-") && sourceId !== "huggingface-blog") {
            throw error;
        }
        xml = await (0, exports.fetchTextWithLegacyTls)(sourceUrl(sourceId));
    }
    const fetchedAt = new Date().toISOString();
    const blocks = blocksByTag(xml, "item");
    const entries = blocks.length ? blocks : blocksByTag(xml, "entry");
    return entries.slice(0, limit).map((entry, index) => {
        const title = tagText(entry, "title") ?? `Untitled ${sourceName(sourceId)} item`;
        const url = tagText(entry, "link") ??
            tagAttribute(entry, "link", "href") ??
            tagText(entry, "guid") ??
            sourceUrl(sourceId);
        const description = tagRawText(entry, "description") ??
            tagRawText(entry, "summary") ??
            tagRawText(entry, "content:encoded") ??
            tagRawText(entry, "content");
        const imageUrl = tagAttribute(entry, "media:content", "url") ??
            tagAttribute(entry, "media:thumbnail", "url") ??
            tagAttribute(entry, "enclosure", "url");
        return {
            id: makeId(sourceId, url || title, index),
            sourceId,
            title,
            url,
            publishedAt: asIsoDate(tagText(entry, "pubDate") ??
                tagText(entry, "published") ??
                tagText(entry, "dc:date") ??
                tagText(entry, "updated")),
            updatedAt: asIsoDate(tagText(entry, "updated")),
            language: rssLanguage[sourceId],
            summaryFromSource: compactText(stripTags(description ?? "")),
            rawText: stripTags(description ?? ""),
            imageUrls: imageUrl ? [imageUrl] : [],
            fetchedAt
        };
    }).filter((item) => !(sourceId === "cnbc-world-rss" &&
        /\bCNBC\s+Daily\s+Open\b/iu.test(item.title)));
}
const citySourceIdFor = (country, city) => `city-news-rss:${encodeURIComponent(`${country}-${city}`)}`;
const fetchNewsRssText = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), defaultTimeoutMs);
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": userAgent },
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
const isUsefulCityDiscoveryItem = (title, url, city) => {
    const normalizedTitle = title.replace(/\s+/gu, " ").trim();
    const blocked = /百科|旅游|景点|攻略|地图|天气|知乎|小红书|博客|招聘|课程/iu.test(normalizedTitle) ||
        /baike\.baidu|map\.baidu|zhihu\.com|xiaohongshu\.com|weather\.com/iu.test(url);
    if (blocked) {
        return false;
    }
    const decisionRelevant = /政策|规划|条例|办法|通知|试点|项目|建设|开通|高速|交通|地铁|道路|医院|医疗|教育|学校|就业|人才|社保|住房|服务业|消费|产业|企业|营商|治理|环保|污水|公共服务|台风|暴雨|洪水|地震|山火|预警|应急响应|事故|停水|停电|道路封闭/iu.test(normalizedTitle);
    return normalizedTitle.includes(city) && normalizedTitle.length >= 8 && normalizedTitle.length <= 90 && decisionRelevant;
};
exports.isUsefulCityDiscoveryItem = isUsefulCityDiscoveryItem;
const dateFromPageText = (value) => {
    const match = value.match(/(20\d{2})[年\-/](\d{1,2})[月\-/](\d{1,2})/u);
    if (!match) {
        return undefined;
    }
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T00:00:00+08:00`;
};
const fetchCityOfficialRawItems = async (country, city, limit, sourceId) => {
    if (country !== "中国") {
        return [];
    }
    const location = (0, citySourceDirectory_1.resolveCitySourceLocation)(country, city);
    const links = [];
    for (const pageUrl of (0, citySourceDirectory_1.cityOfficialSourceUrls)(country, city, env("CONTENT_CITY_OFFICIAL_URLS_JSON"))) {
        try {
            const html = await fetchText(pageUrl);
            links.push(...htmlLinks(html, pageUrl)
                .filter((link) => (0, exports.isUsefulCityDiscoveryItem)(link.title, link.url, city)));
        }
        catch {
            continue;
        }
    }
    const selectedLinks = uniqueByUrl(links).slice(0, Math.min(limit, 10));
    return Promise.all(selectedLinks.map(async (link, index) => {
        let publishedAt = dateFromCompactUrl(link.url) ?? dateFromSlashUrl(link.url) ?? dateFromPageText(link.title);
        let summary = link.title;
        if (!publishedAt) {
            try {
                const article = await fetchText(link.url);
                publishedAt = dateFromPageText(article);
                summary = compactText(stripTags(article)) ?? link.title;
            }
            catch {
                // The link remains a discovery result but is excluded from edition filtering without a date.
            }
        }
        return {
            id: makeId(sourceId, link.url, index),
            sourceId,
            title: link.title,
            url: link.url,
            publishedAt,
            language: "zh",
            summaryFromSource: compactText(summary),
            rawText: summary,
            imageUrls: [],
            fetchedAt: new Date().toISOString(),
            localProvince: location.province,
            localCity: city,
            originalLanguage: "zh",
            translationStatus: "not-needed"
        };
    })).then((items) => items.filter((item) => Boolean(item.publishedAt)));
};
async function fetchCityNewsRawItems(country, city, limit) {
    const sourceId = citySourceIdFor(country, city);
    const location = (0, citySourceDirectory_1.resolveCitySourceLocation)(country, city);
    const query = `${country} ${location.province} ${city} 政策 灾害 交通 公共服务`;
    const template = env("CONTENT_CITY_NEWS_RSS_TEMPLATE");
    const configuredUrl = template
        ?.replaceAll("{query}", encodeURIComponent(query))
        .replaceAll("{country}", encodeURIComponent(country))
        .replaceAll("{city}", encodeURIComponent(city));
    const urls = configuredUrl
        ? [configuredUrl]
        : [
            `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&setlang=zh-cn`,
            `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
        ];
    const fetchedAt = new Date().toISOString();
    const officialItems = await fetchCityOfficialRawItems(country, city, limit, sourceId);
    const entries = [];
    const errors = [];
    for (const url of urls) {
        try {
            let xml;
            try {
                xml = await fetchNewsRssText(url);
            }
            catch {
                xml = await (0, exports.fetchTextWithLegacyTls)(url);
            }
            entries.push(...blocksByTag(xml, "item"));
            if (entries.length >= Math.min(limit, 5)) {
                break;
            }
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
        }
    }
    if (!entries.length && !officialItems.length && errors.length) {
        throw new Error(`All city-news discovery feeds failed: ${errors.join(" | ")}`);
    }
    const searchItems = entries
        .map((entry, index) => {
        const title = tagText(entry, "title") ?? `${city}本地新闻`;
        const link = tagText(entry, "link") ?? urls[0];
        const description = tagRawText(entry, "description");
        return {
            id: makeId(sourceId, link || title, index),
            sourceId,
            title,
            url: link,
            publishedAt: asIsoDate(tagText(entry, "pubDate")),
            language: "zh",
            summaryFromSource: compactText(stripTags(description ?? "")),
            rawText: stripTags(description ?? ""),
            imageUrls: [],
            fetchedAt,
            localProvince: location.province,
            localCity: city,
            originalLanguage: "zh",
            translationStatus: "not-needed"
        };
    })
        .filter((item) => (0, exports.isUsefulCityDiscoveryItem)(item.title, item.url, city));
    return uniqueByUrl([...officialItems, ...searchItems]).slice(0, limit);
}
async function fetchCityContentSource(country, city, limit) {
    const sourceId = citySourceIdFor(country, city);
    const startedAt = Date.now();
    const fetchedAt = new Date().toISOString();
    const location = (0, citySourceDirectory_1.resolveCitySourceLocation)(country, city);
    const sourceLabel = location.province === location.city ? city : `${location.province}·${city}`;
    try {
        const items = await fetchCityNewsRawItems(country, city, limit);
        return {
            sourceId,
            sourceName: `城市新闻发现：${sourceLabel}`,
            ok: true,
            fetchedAt,
            method: "web",
            endpointUrl: `city-source:${country}/${location.province}/${city}`,
            attempts: 1,
            durationMs: Math.max(1, Date.now() - startedAt),
            fallbackUsed: false,
            items: enrichRawItems(sourceId, items),
            note: "城市新闻发现源；政策和风险内容仍需官方或主流来源确认。"
        };
    }
    catch (error) {
        return {
            sourceId,
            sourceName: `城市新闻发现：${sourceLabel}`,
            ok: false,
            fetchedAt,
            method: "web",
            endpointUrl: `city-source:${country}/${location.province}/${city}`,
            attempts: 1,
            durationMs: Math.max(1, Date.now() - startedAt),
            fallbackUsed: false,
            items: [],
            error: error instanceof Error ? error.message : String(error),
            note: "城市发现源暂时不可用，不能把城市字段当作已完成覆盖。"
        };
    }
}
async function fetchMfaRawItems(limit) {
    const sourceId = "mfa-cn-news";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /\/fyrbt_674889\/20\d{4}\/t20\d{6}_\d+\.shtml$/u.test(link.url))).slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: dateFromMoeUrl(link.url),
        language: "zh",
        summaryFromSource: "中国外交部官方信息，用于核对国际重大事件中的中国立场、领事提醒和外交政策变化。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
async function fetchMofcomTradeRawItems(limit) {
    const sourceId = "mofcom-trade";
    const listUrl = sourceUrl(sourceId);
    const html = await fetchText(listUrl);
    const fetchedAt = new Date().toISOString();
    const links = [...html.matchAll(/<li\b[^>]*>[\s\S]*?<a\b[^>]*href=["'](?<href>[^"']+)["'][^>]*>(?<title>[\s\S]*?)<\/a>\s*<span[^>]*>\[?(?<date>20\d{2}-\d{2}-\d{2})\]?<\/span>[\s\S]*?<\/li>/giu)]
        .map((match) => ({
        title: stripTags(match.groups?.title ?? ""),
        url: absoluteUrl(match.groups?.href ?? "", listUrl) ?? listUrl,
        date: match.groups?.date
    }))
        .filter((link) => /\/xwfb\/[^?#]*\/art\/20\d{2}\/[^?#]*\.html$/u.test(link.url))
        .filter((link) => /关税|外贸|贸易|出口|进口|制裁|投资|经贸|跨境|海关|航运|能源|市场|谈判|管制|实体清单|新闻发布会/u.test(link.title))
        .sort((left, right) => (right.date ?? "").localeCompare(left.date ?? ""))
        .slice(0, limit);
    return links.map((link, index) => ({
        id: makeId(sourceId, link.url, index),
        sourceId,
        title: link.title,
        url: link.url,
        publishedAt: link.date
            ? `${link.date}T00:00:00+08:00`
            : dateFromSlashUrl(link.url) ?? dateFromChineseListText(link.title),
        language: "zh",
        summaryFromSource: "商务部官方信息，用于确认关税、外贸、出口管制、跨境电商和对外经贸政策。",
        rawText: link.title,
        imageUrls: [],
        fetchedAt
    }));
}
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
    const html = await fetchChinesePage(listUrl);
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
    const html = await fetchChinesePage(listUrl);
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
    const page = await fetchChinesePageCandidates(sourceId, sourceEndpointCandidates(sourceId));
    const listUrl = page.url;
    const html = page.text;
    const fetchedAt = new Date().toISOString();
    const links = uniqueByUrl(htmlLinks(html, listUrl)
        .filter((link) => /\/(gzdt|gztz|zcfg)\/art\/20\d{2}\/art_[^/]+\.html$/.test(link.url) || link.url.includes("scyxs.mofcom.gov.cn"))
        .filter((link) => /消费|市场|零售|电商|电子商务|汽车|流通|发票|健康消费|以旧换新|服务消费|餐饮|商贸|首发|购物|精品|生活必需品/.test(link.title))).slice(0, limit);
    return Promise.all(links.map(async (link, index) => {
        const title = cleanMofcomTitle(link.title);
        let publishedAt = dateFromMoeUrl(link.url) ?? dateFromSlashUrl(link.url);
        if (!publishedAt) {
            try {
                const article = await fetchChinesePage(link.url);
                publishedAt = dateFromPageText(article);
            }
            catch {
                // Keep the item as a visible source result; edition filtering excludes it without a verified date.
            }
        }
        return {
            id: makeId(sourceId, link.url, index),
            sourceId,
            title,
            url: link.url,
            publishedAt,
            language: "zh",
            summaryFromSource: "商务部市场运行和消费促进候选，用于消费促进、市场运行、流通、电商和服务消费相关动态发现。",
            rawText: title,
            imageUrls: [],
            fetchedAt
        };
    }));
}
async function fetchGdeltRawItems(limit) {
    const sourceId = "gdelt-doc-api";
    const fetchedAt = new Date().toISOString();
    const queries = [
        "(war OR conflict OR ceasefire OR sanctions OR tariff OR election OR president OR shipping OR Hormuz)",
        "(China AND (trade OR customs OR tariff OR export OR sanctions OR shipping OR policy))",
        "(earthquake OR typhoon OR flood OR wildfire OR disaster)",
        "(artificial intelligence OR AI OR model OR semiconductor OR chip)"
    ];
    const responses = [];
    for (const [index, query] of queries.entries()) {
        if (index > 0) {
            await delay(5200);
        }
        try {
            const params = new URLSearchParams({
                query,
                mode: "ArtList",
                format: "json",
                maxrecords: String(limit),
                sort: "datedesc"
            });
            const text = await fetchText(`${sourceUrl(sourceId)}?${params.toString()}`);
            if (!text.trim().startsWith("{")) {
                throw new Error(compactText(text, 180) ?? "GDELT returned a non-JSON response");
            }
            const json = JSON.parse(text);
            responses.push({ status: "fulfilled", value: json.articles ?? [] });
        }
        catch (error) {
            responses.push({ status: "rejected", reason: error });
        }
    }
    const articles = responses
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value);
    if (!articles.length) {
        const firstFailure = responses.find((result) => result.status === "rejected");
        throw firstFailure?.reason instanceof Error
            ? firstFailure.reason
            : new Error("GDELT returned no articles for any discovery query");
    }
    const items = articles.map((article, index) => {
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
    return uniqueByUrl(items);
}
async function fetchReliefWebRawItems(limit) {
    const sourceId = "reliefweb-api";
    const appName = env("CONTENT_RELIEFWEB_APPNAME");
    if (!appName) {
        throw new Error("ReliefWeb requires an approved CONTENT_RELIEFWEB_APPNAME");
    }
    const params = new URLSearchParams({
        appname: appName,
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
    const startedAt = Date.now();
    let attempts = 0;
    fallbackUsedBySource.delete(sourceId);
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
            "bbc-world-rss": (itemLimit) => fetchRssRawItems("bbc-world-rss", itemLimit),
            "bbc-business-rss": (itemLimit) => fetchRssRawItems("bbc-business-rss", itemLimit),
            "bbc-technology-rss": (itemLimit) => fetchRssRawItems("bbc-technology-rss", itemLimit),
            "npr-world-rss": (itemLimit) => fetchRssRawItems("npr-world-rss", itemLimit),
            "sky-world-rss": (itemLimit) => fetchRssRawItems("sky-world-rss", itemLimit),
            "france24-middle-east-rss": (itemLimit) => fetchRssRawItems("france24-middle-east-rss", itemLimit),
            "france24-asia-pacific-rss": (itemLimit) => fetchRssRawItems("france24-asia-pacific-rss", itemLimit),
            "wsj-world-rss": (itemLimit) => fetchRssRawItems("wsj-world-rss", itemLimit),
            "cnbc-world-rss": (itemLimit) => fetchRssRawItems("cnbc-world-rss", itemLimit),
            "un-news-rss": (itemLimit) => fetchRssRawItems("un-news-rss", itemLimit),
            "mfa-cn-news": fetchMfaRawItems,
            "mofcom-trade": fetchMofcomTradeRawItems,
            "openai-news": (itemLimit) => fetchRssRawItems("openai-news", itemLimit),
            "deepmind-blog": (itemLimit) => fetchRssRawItems("deepmind-blog", itemLimit),
            "moe-cn": fetchMoeRawItems,
            "chrm-mohrss": fetchChrmRawItems,
            "stats-cn-data": fetchStatsDataRawItems,
            "mofcom-consumption": fetchMofcomConsumptionRawItems,
            "huggingface-blog": (itemLimit) => fetchRssRawItems("huggingface-blog", itemLimit),
            "techcrunch-ai-rss": (itemLimit) => fetchRssRawItems("techcrunch-ai-rss", itemLimit),
            "theverge-ai-rss": (itemLimit) => fetchRssRawItems("theverge-ai-rss", itemLimit),
            "gdelt-doc-api": fetchGdeltRawItems,
            "reliefweb-api": fetchReliefWebRawItems
        };
        const fetcher = fetchers[sourceId];
        let items;
        let lastError;
        // Some international feeds reset a connection under concurrent access but
        // succeed in isolation. Retry those transient failures before declaring a
        // lane unavailable in the audit report.
        for (let attempt = 0; attempt < 3; attempt += 1) {
            attempts += 1;
            try {
                items = await fetcher(limit);
                break;
            }
            catch (error) {
                lastError = error;
                const message = error instanceof Error ? error.message : String(error);
                const transientNetworkFailure = /timed out|fetch failed|socket|network|ECONN|ENOTFOUND|HTTP\s+5\d{2}/iu.test(message);
                if (!transientNetworkFailure || attempt === 2) {
                    throw error;
                }
                await delay(700 * (attempt + 1));
            }
        }
        if (!items) {
            throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Source returned no result"));
        }
        return {
            sourceId,
            sourceName: sourceName(sourceId),
            ok: true,
            fetchedAt,
            method: sourceMethod(sourceId),
            endpointUrl: sourceUrl(sourceId),
            attempts,
            durationMs: Date.now() - startedAt,
            fallbackUsed: fallbackUsedBySource.get(sourceId) ?? false,
            items: enrichRawItems(sourceId, items),
            note: fallbackUsedBySource.get(sourceId) ? "主入口失败后使用了官方备用入口。" : undefined
        };
    }
    catch (error) {
        return {
            sourceId,
            sourceName: sourceName(sourceId),
            ok: false,
            fetchedAt,
            method: sourceMethod(sourceId),
            endpointUrl: sourceUrl(sourceId),
            attempts,
            durationMs: Date.now() - startedAt,
            fallbackUsed: fallbackUsedBySource.get(sourceId) ?? false,
            items: [],
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function fetchRawContentSources(sourceIds, limit) {
    const results = new Array(sourceIds.length);
    let nextIndex = 0;
    const concurrency = Math.min(4, sourceIds.length);
    const worker = async () => {
        while (nextIndex < sourceIds.length) {
            const index = nextIndex;
            nextIndex += 1;
            results[index] = await fetchRawContentSource(sourceIds[index], limit);
        }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
}
