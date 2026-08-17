"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rawFetchers_1 = require("../src/content/rawFetchers");
const stableSources = [
    "gov-cn-policy-library",
    "mem-cn",
    "cac-cn",
    "xinhua-world",
    "xinhua-tech",
    "france24-middle-east-rss",
    "france24-asia-pacific-rss",
    "moe-cn",
    "chrm-mohrss",
    "stats-cn-data",
    "mofcom-consumption"
];
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
    "mofcom-consumption",
    "techcrunch-ai-rss",
    "theverge-ai-rss"
];
const sourceShortNames = {
    "arxiv-cs-api": "arxiv",
    "cas-science-news": "cas",
    "mohurd-construction": "construction",
    "gdacs-feed": "gdacs",
    "gov-cn-policy-library": "gov",
    "mem-cn": "mem",
    "cac-cn": "cac",
    "xinhua-world": "xinhua-world",
    "xinhua-tech": "xinhua-tech",
    "france24-middle-east-rss": "france24-middle-east",
    "france24-asia-pacific-rss": "france24-asia",
    "moe-cn": "moe",
    "chrm-mohrss": "chrm",
    "stats-cn-data": "stats",
    "mofcom-consumption": "mofcom",
    "huggingface-blog": "huggingface",
    "techcrunch-ai-rss": "techcrunch-ai",
    "theverge-ai-rss": "theverge-ai",
    "gdelt-doc-api": "gdelt",
    "reliefweb-api": "reliefweb"
};
function parseArgs(argv) {
    const options = {
        sources: stableSources,
        limit: 3,
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
        if (arg === "--source" || arg === "-s") {
            const rawSources = (argv[index + 1] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
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
            options.limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10) : options.limit;
            index += 1;
        }
    }
    return options;
}
function printHelp() {
    console.log(`真实来源候选试抓脚本

默认只抓稳定来源：arxiv, gdacs, moe, chrm, stats, mofcom。
这一步只生成候选预览，不会自动发布到 App。

用法：
  pnpm fetch:raw
  pnpm fetch:raw -- --source arxiv --limit 2
  pnpm fetch:raw -- --source arxiv,gdacs --limit 4
  pnpm fetch:raw -- --all
  pnpm fetch:raw -- --json

来源：
  - arxiv      AI / 计算机科学研究趋势
  - gdacs      全球灾害与公共风险提醒
  - moe        教育部新闻与教育方向候选
  - chrm       中国人力资源市场网公告，HR / 招聘方向候选
  - stats      国家统计局数据发布，运营 / 消费 / 市场数据方向候选
  - mofcom     商务部市场运行和消费促进，运营 / 消费 / 电商方向候选
  - gdelt      全球新闻发现，可能遇到频率限制
  - reliefweb  人道灾害报告，当前网络可能返回 403
`);
}
const compact = (value, max = 120) => {
    if (!value) {
        return "";
    }
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= max) {
        return normalized;
    }
    return `${normalized.slice(0, max).trim()}...`;
};
function formatResult(result) {
    const lines = [];
    lines.push("=".repeat(34));
    lines.push(`${result.sourceName} (${sourceShortNames[result.sourceId] ?? result.sourceId})`);
    lines.push(result.ok ? `状态：成功，抓到 ${result.items.length} 条候选` : `状态：失败，${result.error ?? "未知错误"}`);
    if (result.items.length) {
        result.items.forEach((item, index) => {
            lines.push("");
            lines.push(`${index + 1}. ${item.title}`);
            lines.push(`   发布时间：${item.publishedAt ?? "未知"}`);
            lines.push(`   链接：${item.url}`);
            if (item.summaryFromSource) {
                lines.push(`   来源摘要：${compact(item.summaryFromSource)}`);
            }
        });
    }
    return lines.join("\n");
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }
    const results = await (0, rawFetchers_1.fetchRawContentSources)(options.sources, options.limit);
    if (options.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
    }
    console.log("真实来源候选试抓");
    console.log(`来源：${options.sources.map((sourceId) => sourceShortNames[sourceId] ?? sourceId).join("、")}`);
    console.log(`每个来源最多 ${options.limit} 条`);
    console.log("");
    console.log(results.map(formatResult).join("\n\n"));
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
