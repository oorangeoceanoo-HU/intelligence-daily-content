"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flushTranslationCache = exports.needsChineseTranslation = exports.normalizeBriefingCardChinese = exports.normalizeChineseTranslation = void 0;
exports.translateText = translateText;
exports.translateRawContentItem = translateRawContentItem;
exports.translateRawContentItems = translateRawContentItems;
exports.translateArticleDetails = translateArticleDetails;
const nodeRequire = typeof require === "function" ? require : undefined;
// Keep a tiny, explicit correction list for literal machine translations that
// are unfit for a Chinese news title. This is not a substitute for editorial
// translation and deliberately only touches unambiguous phrases.
const normalizeChineseTranslation = (value) => value
    .replace(/一二拳/gu, "双重冲击")
    .replace(/(\d+(?:\.\d+)?)B\+\s*美元/gu, (_match, billions) => {
    const yi = Number(billions) * 10;
    return Number.isFinite(yi) ? `${yi}亿美元以上` : _match;
});
exports.normalizeChineseTranslation = normalizeChineseTranslation;
const normalizeBriefingCardChinese = (card) => ({
    ...card,
    title: (0, exports.normalizeChineseTranslation)(card.title),
    oneLine: (0, exports.normalizeChineseTranslation)(card.oneLine),
    body: Object.fromEntries(Object.entries(card.body).map(([key, value]) => [key, (0, exports.normalizeChineseTranslation)(value)]))
});
exports.normalizeBriefingCardChinese = normalizeBriefingCardChinese;
const env = (name) => process.env?.[name]?.trim() || undefined;
const provider = () => env("CONTENT_TRANSLATION_PROVIDER") ?? "google-free";
const endpoint = () => env("CONTENT_TRANSLATION_ENDPOINT") ??
    "https://translate.googleapis.com/translate_a/single";
const apiKey = () => env("CONTENT_TRANSLATION_API_KEY");
const myMemoryEndpoint = () => env("CONTENT_TRANSLATION_MYMEMORY_ENDPOINT") ??
    "https://api.mymemory.translated.net/get";
const translationTimeoutMs = 20000;
const translationRetryDelaysMs = [500, 1500];
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const withTranslationRetries = async (operation) => {
    let lastError;
    for (let attempt = 0; attempt <= translationRetryDelaysMs.length; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt < translationRetryDelaysMs.length) {
                await delay(translationRetryDelaysMs[attempt]);
            }
        }
    }
    throw lastError;
};
const fetchTextWithLegacyTls = async (url, init = {}) => new Promise((resolve, reject) => {
    const nodeRequire = typeof require === "function" ? require : undefined;
    if (!nodeRequire) {
        reject(new Error("translation fallback is only available in the Node generator"));
        return;
    }
    const https = nodeRequire("node:https");
    const crypto = nodeRequire("node:crypto");
    const { Buffer: NodeBuffer } = nodeRequire("node:buffer");
    const request = https.request(url, {
        method: init.method ?? "GET",
        headers: {
            Accept: "application/json",
            "User-Agent": "intelligence-daily-app/0.1",
            ...(init.headers ?? {})
        },
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
            const text = new TextDecoder("utf-8").decode(NodeBuffer.concat(chunks));
            if (response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(`translation HTTP ${response.statusCode}: ${compact(text, 180)}`));
                return;
            }
            resolve(text);
        });
    });
    request.on("error", reject);
    request.setTimeout(translationTimeoutMs, () => request.destroy(new Error("translation request timed out")));
    if (typeof init.body === "string") {
        request.write(init.body);
    }
    request.end();
});
const compact = (value, maxLength) => {
    const normalized = value.replace(/\s+/gu, " ").trim();
    return normalized.length <= maxLength
        ? normalized
        : `${normalized.slice(0, maxLength).trim()}...`;
};
const chineseCount = (value) => value.match(/[\u4e00-\u9fff]/gu)?.length ?? 0;
const latinCount = (value) => value.match(/[A-Za-z]/gu)?.length ?? 0;
const needsChineseTranslation = (value, language) => {
    const normalized = value.replace(/\s+/gu, " ").trim();
    if (!normalized) {
        return false;
    }
    const latin = latinCount(normalized);
    const chinese = chineseCount(normalized);
    return language === "en" || (language === "multi" && latin >= 20 && latin > chinese * 1.15);
};
exports.needsChineseTranslation = needsChineseTranslation;
const fetchJson = async (url, init) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), translationTimeoutMs);
    try {
        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    ...(init.headers ?? {})
                }
            });
            const text = await response.text();
            if (!response.ok) {
                throw new Error(`translation HTTP ${response.status}: ${compact(text, 180)}`);
            }
            return JSON.parse(text);
        }
        catch (error) {
            if (typeof require !== "function") {
                throw error;
            }
            return JSON.parse(await fetchTextWithLegacyTls(url, init));
        }
    }
    finally {
        clearTimeout(timeoutId);
    }
};
const googleTranslate = async (text) => withTranslationRetries(async () => {
    const url = new URL(endpoint());
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", "zh-CN");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);
    const payload = await fetchJson(url.toString(), { method: "GET" });
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
        throw new Error("translation response did not contain translated segments");
    }
    const translated = payload[0]
        .filter((segment) => Array.isArray(segment))
        .map((segment) => (typeof segment[0] === "string" ? segment[0] : ""))
        .join("")
        .trim();
    if (!translated) {
        throw new Error("translation response was empty");
    }
    return translated;
});
const openAiCompatibleTranslate = async (text) => {
    const key = apiKey();
    if (!key) {
        throw new Error("CONTENT_TRANSLATION_API_KEY is required for openai-compatible translation");
    }
    const model = env("CONTENT_TRANSLATION_MODEL") ?? "gpt-4o-mini";
    const payload = await fetchJson(endpoint(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
            model,
            ...(model.toLowerCase().startsWith("qwen3") ? { enable_thinking: false } : {}),
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: "你是新闻编辑。把输入完整翻译并整理成自然、准确、简洁的简体中文。保留人名、机构名、日期、数字和不确定性，不补写输入中没有的事实。只输出中文结果。"
                },
                { role: "user", content: text }
            ]
        })
    });
    const translated = payload.choices?.[0]?.message?.content?.trim();
    if (!translated) {
        throw new Error("openai-compatible translation response was empty");
    }
    return translated;
};
const myMemoryTranslateChunk = async (text) => {
    const url = new URL(myMemoryEndpoint());
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "en|zh-CN");
    const contactEmail = env("CONTENT_TRANSLATION_CONTACT_EMAIL");
    if (contactEmail) {
        url.searchParams.set("de", contactEmail);
    }
    const payload = await fetchJson(url.toString(), { method: "GET" });
    if (payload.quotaFinished) {
        throw new Error("MyMemory translation quota is exhausted");
    }
    const translated = payload.responseData?.translatedText?.trim();
    if (!translated || payload.responseStatus !== 200) {
        throw new Error("MyMemory translation response was empty");
    }
    return translated;
};
const splitTranslationChunks = (text, maxLength = 480) => {
    const sentences = text.split(/(?<=[.!?。！？])\s+/u).filter(Boolean);
    const chunks = [];
    let current = "";
    sentences.forEach((sentence) => {
        if (!current) {
            current = sentence;
            return;
        }
        if (current.length + sentence.length + 1 <= maxLength) {
            current += ` ${sentence}`;
            return;
        }
        chunks.push(current);
        current = sentence;
    });
    if (current) {
        chunks.push(current);
    }
    if (!chunks.length) {
        return [text];
    }
    return chunks.flatMap((chunk) => {
        if (chunk.length <= maxLength) {
            return [chunk];
        }
        return chunk.match(new RegExp(`.{1,${maxLength}}`, "gu")) ?? [chunk];
    });
};
const myMemoryTranslate = async (text) => {
    const chunks = splitTranslationChunks(text);
    const translated = [];
    for (const chunk of chunks) {
        translated.push(await myMemoryTranslateChunk(chunk));
    }
    return translated.join(" ").trim();
};
const googleTranslateViaPowerShell = async (text) => withTranslationRetries(async () => {
    if (!nodeRequire || nodeRequire("node:process").platform !== "win32") {
        throw new Error("PowerShell translation adapter is only available on Windows");
    }
    const childProcess = nodeRequire("node:child_process");
    const processEnv = nodeRequire("node:process").env;
    const encodedText = nodeRequire("node:buffer").Buffer.from(text, "utf8").toString("base64");
    const script = [
        "$text=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:INTELLIGENCE_TRANSLATION_TEXT))",
        "$q=[Uri]::EscapeDataString($text)",
        "$u='https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q='+$q",
        "$r=Invoke-RestMethod -UseBasicParsing -Uri $u -TimeoutSec 20",
        "$parts=@(); foreach($segment in $r[0]) { if($segment[0]) { $parts += [string]$segment[0] } }",
        "[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)",
        "[Console]::Write(($parts -join ''))"
    ].join("; ");
    return new Promise((resolve, reject) => {
        childProcess.execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
            env: { ...processEnv, INTELLIGENCE_TRANSLATION_TEXT: encodedText },
            windowsHide: true,
            maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr.trim() || error.message));
                return;
            }
            const translated = stdout.trim();
            if (!translated) {
                reject(new Error("PowerShell translation response was empty"));
                return;
            }
            resolve(translated);
        });
    });
});
const translationCache = new Map();
let cacheLoaded = false;
let cacheDirty = false;
const translationCacheFile = () => env("CONTENT_TRANSLATION_CACHE_FILE");
const cacheKeyFor = (text) => `${provider()}\n${endpoint()}\n${text}`;
const loadTranslationCache = async () => {
    if (cacheLoaded) {
        return;
    }
    cacheLoaded = true;
    const filePath = translationCacheFile();
    if (!filePath || !nodeRequire) {
        return;
    }
    try {
        const fs = nodeRequire("node:fs/promises");
        const values = JSON.parse(await fs.readFile(filePath, "utf8"));
        Object.entries(values).forEach(([key, value]) => translationCache.set(key, value));
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
};
const flushTranslationCache = async () => {
    const filePath = translationCacheFile();
    if (!filePath || !nodeRequire || !cacheDirty) {
        return;
    }
    const fs = nodeRequire("node:fs/promises");
    const path = nodeRequire("node:path");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(Object.fromEntries(translationCache), null, 2)}\n`, "utf8");
    cacheDirty = false;
};
exports.flushTranslationCache = flushTranslationCache;
async function translateText(text) {
    const normalized = compact(text, 2400);
    if (!normalized) {
        return normalized;
    }
    await loadTranslationCache();
    const cacheKey = cacheKeyFor(normalized);
    const cached = translationCache.get(cacheKey);
    if (cached) {
        return (0, exports.normalizeChineseTranslation)(cached);
    }
    let translated;
    if (provider() === "openai-compatible") {
        translated = await openAiCompatibleTranslate(normalized);
    }
    else if (provider() === "google-free") {
        const isWindows = Boolean(nodeRequire && nodeRequire("node:process").platform === "win32");
        if (isWindows) {
            try {
                translated = await googleTranslateViaPowerShell(normalized);
            }
            catch {
                translated = await myMemoryTranslate(normalized);
            }
        }
        else {
            try {
                translated = await googleTranslate(normalized);
            }
            catch {
                translated = await myMemoryTranslate(normalized);
            }
        }
    }
    else {
        translated = await myMemoryTranslate(normalized);
    }
    translated = (0, exports.normalizeChineseTranslation)(translated);
    translationCache.set(cacheKey, translated);
    cacheDirty = true;
    return translated;
}
const translateField = async (value, language) => {
    if (!value || !(0, exports.needsChineseTranslation)(value, language)) {
        return value;
    }
    return translateText(value);
};
async function translateRawContentItem(item) {
    const originalLanguage = item.originalLanguage ?? item.language;
    const requiresTranslation = [item.title, item.summaryFromSource, item.rawText]
        .filter((value) => Boolean(value))
        .some((value) => (0, exports.needsChineseTranslation)(value, originalLanguage));
    if (!requiresTranslation) {
        return {
            ...item,
            originalLanguage,
            translationStatus: "not-needed"
        };
    }
    try {
        const translatedTitle = await translateField(item.title, originalLanguage);
        const translatedSummary = await translateField(item.summaryFromSource, originalLanguage);
        const translatedRawText = item.rawText === item.summaryFromSource
            ? translatedSummary
            : await translateField(item.rawText, originalLanguage);
        return {
            ...item,
            title: translatedTitle ?? item.title,
            summaryFromSource: translatedSummary,
            rawText: translatedRawText,
            language: "zh",
            originalLanguage,
            translationStatus: "translated",
            translationError: undefined
        };
    }
    catch (error) {
        return {
            ...item,
            originalLanguage,
            translationStatus: "failed",
            translationError: error instanceof Error ? error.message : String(error)
        };
    }
}
async function translateRawContentItems(items) {
    const stats = {
        requested: 0,
        translated: 0,
        failed: 0,
        skipped: 0,
        provider: provider(),
        failures: []
    };
    const output = [];
    // Avoid burst-limiting the free fallback while a stable translation API
    // has not yet been configured for the scheduled job.
    const concurrency = 2;
    for (let start = 0; start < items.length; start += concurrency) {
        const batch = items.slice(start, start + concurrency);
        const translatedBatch = await Promise.all(batch.map(async (item) => {
            const originalLanguage = item.originalLanguage ?? item.language;
            const requiresTranslation = [item.title, item.summaryFromSource, item.rawText]
                .filter((value) => Boolean(value))
                .some((value) => (0, exports.needsChineseTranslation)(value, originalLanguage));
            if (requiresTranslation) {
                stats.requested += 1;
            }
            const result = await translateRawContentItem(item);
            if (result.translationStatus === "translated") {
                stats.translated += 1;
            }
            else if (result.translationStatus === "failed") {
                stats.failed += 1;
                stats.failures.push({ itemId: item.id, error: result.translationError ?? "unknown translation error" });
            }
            else {
                stats.skipped += 1;
            }
            return result;
        }));
        output.push(...translatedBatch);
    }
    return { items: output, stats };
}
async function translateArticleDetails(details) {
    const output = [];
    for (const detail of details) {
        const language = detail.sourceLink.originalLanguage ?? detail.sourceLink.language;
        const requiresTranslation = (0, exports.needsChineseTranslation)(`${detail.title} ${detail.text}`, language);
        if (!requiresTranslation || detail.status === "failed") {
            output.push(detail);
            continue;
        }
        try {
            const [title, text] = await Promise.all([
                translateText(detail.title),
                translateText(detail.text)
            ]);
            output.push({
                ...detail,
                title,
                text,
                charCount: text.length,
                sourceLink: { ...detail.sourceLink, translationStatus: "translated" }
            });
        }
        catch (error) {
            output.push({
                ...detail,
                error: detail.error ?? (error instanceof Error ? error.message : String(error))
            });
        }
    }
    return output;
}
