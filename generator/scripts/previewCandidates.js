"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const candidateGenerator_1 = require("../src/content/candidateGenerator");
const candidatePreviewProfiles_1 = require("../src/content/candidatePreviewProfiles");
const sourceRegistry_1 = require("../src/content/sourceRegistry");
const laneLabels = {
    mustKnow: "必须知道",
    risk: "风险提醒",
    industry: "行业重点",
    local: "城市相关",
    light: "轻阅读"
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
const sectionLabels = {
    front: "头版",
    world: "国际",
    china: "国内",
    local: "本地",
    industry: "行业",
    ai: "AI",
    product: "产品",
    risk: "风险",
    friends: "好友",
    light: "轻阅读"
};
function parseArgs(argv) {
    const options = {
        limit: 8,
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
        if (arg === "--profile" || arg === "-p") {
            options.profile = argv[index + 1];
            index += 1;
            continue;
        }
        if (arg === "--limit" || arg === "-l") {
            const parsed = Number(argv[index + 1]);
            options.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : options.limit;
            index += 1;
        }
    }
    return options;
}
function printHelp() {
    console.log(`候选内容预览脚本

用法：
  pnpm preview:candidates
  pnpm preview:candidates -- --profile 教师用户
  pnpm preview:candidates -- --profile "AI 产品用户" --limit 5
  pnpm preview:candidates -- --json

可选画像：
${candidatePreviewProfiles_1.candidatePreviewProfiles.map((item) => `  - ${item.name}`).join("\n")}
`);
}
function sourceName(sourceId) {
    return sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.name ?? sourceId;
}
function compactList(items, max = 6) {
    if (items.length <= max) {
        return items.join("、");
    }
    return `${items.slice(0, max).join("、")} 等 ${items.length} 项`;
}
function formatPreview(preview) {
    const lines = [];
    const plan = preview.plan;
    lines.push("=".repeat(34));
    lines.push(`画像：${preview.profileName}`);
    lines.push(`地区：${plan.country} / ${plan.cities.join("、")}`);
    lines.push(`行业标签：${compactList(plan.industries.map((tag) => industryLabels[tag] ?? tag))}`);
    lines.push(`来源组合：官方 ${plan.sourceMix.official} / 主流 ${plan.sourceMix.mainstream} / 行业 ${plan.sourceMix.industry} / 轻阅读 ${plan.sourceMix.light}`);
    lines.push("");
    lines.push("入选候选卡片：");
    preview.selectedCandidates.forEach((ranked, index) => {
        const laneText = ranked.matchedLaneIds.map((laneId) => laneLabels[laneId] ?? laneId).join(" / ") || "未命中";
        const sourceText = compactList(ranked.candidate.sourceIds.map(sourceName), 3);
        lines.push(`${index + 1}. [${ranked.importanceScore.level}] ${ranked.candidate.title}`);
        lines.push(`   板块：${sectionLabels[ranked.targetSection] ?? ranked.targetSection} / ${laneText}`);
        lines.push(`   分数：综合 ${ranked.finalScore}，相关 ${ranked.relevanceScore.total}，重要 ${ranked.importanceScore.total}`);
        lines.push(`   原因：${ranked.selectedReason}`);
        lines.push(`   来源：${sourceText}`);
    });
    const filtered = preview.rankedCandidates.filter((ranked) => !preview.selectedCandidates.some((selected) => selected.candidate.id === ranked.candidate.id));
    if (filtered.length) {
        lines.push("");
        lines.push("未入选但可参考：");
        filtered.slice(0, 3).forEach((ranked) => {
            lines.push(`- ${ranked.candidate.title}：综合 ${ranked.finalScore}，相关 ${ranked.relevanceScore.total}`);
        });
    }
    return lines.join("\n");
}
function toJsonPreview(preview) {
    return {
        profileName: preview.profileName,
        country: preview.plan.country,
        cities: preview.plan.cities,
        industries: preview.plan.industries,
        sourceMix: preview.plan.sourceMix,
        selected: preview.selectedCandidates.map((ranked) => ({
            id: ranked.candidate.id,
            title: ranked.candidate.title,
            level: ranked.importanceScore.level,
            section: ranked.targetSection,
            lanes: ranked.matchedLaneIds,
            finalScore: ranked.finalScore,
            relevanceScore: ranked.relevanceScore.total,
            importanceScore: ranked.importanceScore.total,
            reason: ranked.selectedReason,
            sources: ranked.candidate.sourceIds.map(sourceName)
        }))
    };
}
function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }
    const matchedProfiles = options.profile
        ? candidatePreviewProfiles_1.candidatePreviewProfiles.filter((item) => item.name.includes(options.profile ?? ""))
        : candidatePreviewProfiles_1.candidatePreviewProfiles;
    if (!matchedProfiles.length) {
        console.log(`没有找到画像：${options.profile}`);
        console.log(`可选画像：${candidatePreviewProfiles_1.candidatePreviewProfiles.map((item) => item.name).join("、")}`);
        process.exitCode = 1;
        return;
    }
    const previews = matchedProfiles.map(({ name, profile }) => (0, candidateGenerator_1.buildCandidateIssuePreview)(name, profile, undefined, options.limit));
    if (options.json) {
        console.log(JSON.stringify(previews.map(toJsonPreview), null, 2));
        return;
    }
    console.log(previews.map(formatPreview).join("\n\n"));
}
main();
