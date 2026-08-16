"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const articleDetails_1 = require("../src/content/articleDetails");
const candidateDeduper_1 = require("../src/content/candidateDeduper");
const rawToCandidate_1 = require("../src/content/rawToCandidate");
const nodeRequire = typeof require === "function" ? require : undefined;
if (!nodeRequire) {
    throw new Error("Node runtime is required");
}
const assert = nodeRequire("node:assert/strict");
const source = (id, url) => ({
    title: id,
    url,
    sourceId: id,
    publishedAt: "2026-08-16T00:00:00+08:00"
});
const candidate = (params) => ({
    id: params.id,
    title: params.title,
    oneLine: "这是一条用于验证内容生成质量的候选信息，需要根据同一篇原文生成完整卡片。",
    categories: params.categories ?? ["disaster", "publicSafety", "china"],
    industries: ["generalPublic", "technologyEngineering"],
    regions: ["中国"],
    locations: params.locations ?? ["中国", "河南"],
    sourceIds: [params.sourceLink.sourceId],
    publishedAt: params.sourceLink.publishedAt ?? "",
    sourceLinks: [params.sourceLink],
    images: [],
    body: {
        background: "这是用于自动检查的事件背景，正文应当始终与标题来自同一个新闻事件。",
        keyProgress: "这是用于自动检查的关键进展，系统需要保留完整标题并生成不同的分析。",
        whyItMatters: "这条信息用于验证内容质量检查是否能够正常运行并阻止错误稿件发布。",
        userRelevance: "如果这条信息与你所在地区或工作领域相关，可以继续查看原文和后续进展。",
        whatToWatch: "接下来关注官方来源是否发布新的事实、时间节点或影响范围。"
    },
    impactScore: params.impactScore ?? 70,
    severityScore: 70,
    freshnessScore: 95,
    trendScore: 50,
    isExample: false
});
const detail = (item, title, text) => ({
    candidateId: item.id,
    sourceLink: item.sourceLinks[0],
    status: "fetched",
    title,
    text,
    imageUrls: [],
    charCount: text.length,
    fetchedAt: "2026-08-17T00:00:00.000Z"
});
const rescue = candidate({
    id: "rescue",
    title: "应急管理部调派救援力量处置河南周口贾鲁河溃口险情",
    sourceLink: source("mem-cn", "https://example.com/rescue")
});
const monthly = candidate({
    id: "monthly",
    title: "应急管理部发布2026年7月全国自然灾害情况",
    sourceLink: source("mem-cn", "https://example.com/monthly")
});
const unrelatedResult = (0, candidateDeduper_1.dedupeCandidateItems)([rescue, monthly]);
assert.equal(unrelatedResult.candidates.length, 2, "不同灾害事件不能因为日期和大类相同而合并");
const quakeA = candidate({
    id: "quake-a",
    title: "Green earthquake (Magnitude 6.1M, Depth:10km) in Indonesia 14/08/2026 22:28 UTC",
    sourceLink: source("gdacs-feed", "https://example.com/quake-a"),
    locations: ["印度尼西亚"]
});
const quakeB = candidate({
    id: "quake-b",
    title: "Green earthquake (Magnitude 5.5M, Depth:39km) in Indonesia 14/08/2026 20:10 UTC",
    sourceLink: source("gdacs-feed", "https://example.com/quake-b"),
    locations: ["印度尼西亚"]
});
assert.equal((0, candidateDeduper_1.dedupeCandidateItems)([quakeA, quakeB]).candidates.length, 2, "同一天同一国家发生的不同震级地震不能合并成一条");
const hormuzQuestion = candidate({
    id: "hormuz-question",
    title: "热点问答丨特朗普想要霍尔木兹海峡，能实现吗？",
    sourceLink: source("xinhua-world", "https://example.com/hormuz-question"),
    categories: ["world", "policy"]
});
const hormuzStatement = candidate({
    id: "hormuz-statement",
    title: "特朗普：击败伊朗后会宣布霍尔木兹海峡为美国领土",
    sourceLink: source("xinhua-world", "https://example.com/hormuz-statement"),
    categories: ["world", "policy"]
});
assert.equal((0, candidateDeduper_1.dedupeCandidateItems)([hormuzQuestion, hormuzStatement]).candidates.length, 1, "同一天同一国际事件的问答和快讯不能重复进入日报");
const rescueFollowUp = candidate({
    id: "rescue-follow-up",
    title: "救援力量驰援河南周口处置贾鲁河溃口险情",
    sourceLink: source("xinhua-world", "https://example.com/rescue-follow-up"),
    impactScore: 92
});
const relatedResult = (0, candidateDeduper_1.dedupeCandidateItems)([rescue, rescueFollowUp]);
assert.equal(relatedResult.candidates.length, 1, "同一事件的相近报道应当合并");
assert.equal(relatedResult.candidates[0].sourceLinks[0].url, rescueFollowUp.sourceLinks[0].url, "合并后首个原文必须属于代表标题");
const truncated = candidate({
    id: "education-title",
    title: "教育科技人才“三位一体”的强国策（深入学习贯彻习近平新时代中国特色社会主义思想...",
    sourceLink: source("moe-cn", "https://example.com/education"),
    categories: ["education", "policy", "china"]
});
const educationDetail = detail(truncated, "教育科技人才“三位一体”的强国策（深入学习贯彻习近平新时代中国特色社会主义思想）", "教育、科技、人才共同构成国家创新体系的重要基础。文章梳理了三者协同发展的历史脉络，并说明教育培养人才、人才推动科技创新、科技成果服务经济社会发展的关系。后续还需关注高校、科研机构和地方教育部门如何形成更具体的协同机制。");
const repairedTitleCard = (0, articleDetails_1.enrichCandidateWithArticleDetail)(truncated, educationDetail);
assert.equal(repairedTitleCard.title, educationDetail.title, "截断标题应改用网页中的完整标题");
assert.ok(!/\.{3,}|…/u.test(repairedTitleCard.title), "完整标题不能保留截断符号");
const rawItem = (params) => ({
    id: params.id,
    sourceId: params.sourceId,
    title: params.title,
    url: params.url ?? `https://example.com/${params.id}`,
    publishedAt: params.publishedAt ?? "2026-08-16T00:00:00+08:00",
    language: params.language ?? "zh",
    summaryFromSource: params.summaryFromSource,
    rawText: params.rawText,
    fetchedAt: params.fetchedAt ?? "2026-08-17T00:00:00.000Z"
});
const historyCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "death-railway",
    sourceId: "xinhua-world",
    title: "日本无条件投降81周年之际 重访桂河大桥“死亡铁路”"
}));
assert.ok(!historyCandidate.categories.includes("disaster"), "历史纪念报道不能因为出现死亡二字被判成灾害预警");
assert.ok(historyCandidate.categories.includes("lightTrend"), "历史纪念报道应降低为轻阅读权重");
const historyCard = (0, articleDetails_1.enrichCandidateWithArticleDetail)(historyCandidate, detail(historyCandidate, historyCandidate.title, "桂河大桥位于泰国北碧府，是缅泰死亡铁路的重要历史遗址。当地正在推动相关遗址申报世界遗产，希望到访者理解战争历史与和平价值。后续保护计划仍需经过相关机构审议。"));
assert.match(historyCard.body.whyItMatters, /历史|公共记忆/u, "历史文章的分析不能套用国际风险模板");
const windCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "wind-casting",
    sourceId: "xinhua-tech",
    title: "我国陆上大兆瓦风电铸件领域取得关键性技术突破",
    summaryFromSource: "新华网科技新闻候选，用于 AI、机器人、芯片、科研和科技产业变化。"
}));
assert.ok(!windCandidate.categories.includes("ai"), "普通工程制造新闻不能被误贴为 AI 新闻");
const monthlyRiskCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "monthly-risk",
    sourceId: "mem-cn",
    title: "国家防灾减灾救灾委员会办公室 应急管理部发布2026年7月全国自然灾害情况"
}));
const monthlyRiskCard = (0, articleDetails_1.enrichCandidateWithArticleDetail)(monthlyRiskCandidate, detail(monthlyRiskCandidate, monthlyRiskCandidate.title, "有关部门对2026年7月全国自然灾害情况进行了会商分析。7月份自然灾害以台风、洪涝和地质灾害为主，多地出现不同程度影响。统计数据用于回顾当月整体情况，个人仍需查看所在地发布的实时预警。"));
assert.match(monthlyRiskCard.oneLine, /^风险概览：/u, "月度灾害统计不能伪装成即时风险提醒");
assert.match(monthlyRiskCard.body.userRelevance ?? "", /当天发布的预警/u, "月度灾害统计应提醒用户以本地实时预警为准");
const topics = [
    ["wind", "我国15兆瓦陆上风电铸件完成交付", "企业完成15兆瓦陆上风电铸件交付，产品通过客户检验。该铸件将用于大功率陆上风电机组，并验证了超大型铸件的研发制造能力。后续仍需关注量产计划、订单规模和整机运行数据。"],
    ["robot", "人形机器人运动会参赛规模扩大", "第二届人形机器人运动会公布参赛规模，多家企业和高校带来新一代机器人。比赛项目覆盖跑步、足球和场景任务，并将检验运动控制和协作能力。后续仍需关注技术能否进入真实产品和服务场景。"],
    ["battery", "高能量水系锌碘电池研究取得进展", "研究团队公布水系锌碘电池的新实验结果，通过材料和结构设计改善能量密度。实验给出了循环性能和安全性数据，但距离规模制造仍需工程验证。后续仍需关注论文、复现实验和产业合作。"]
];
const generated = topics.map(([id, title, text]) => {
    const item = candidate({
        id,
        title,
        sourceLink: source("xinhua-tech", `https://example.com/${id}`),
        categories: ["technology"]
    });
    return (0, articleDetails_1.enrichCandidateWithArticleDetail)(item, detail(item, title, text));
});
assert.equal(new Set(generated.map((item) => item.body.whyItMatters)).size, 3, "不同事件的为什么重要不能完全相同");
assert.equal(new Set(generated.map((item) => item.body.userRelevance)).size, 3, "不同事件的用户相关性不能完全相同");
assert.equal(new Set(generated.map((item) => item.body.whatToWatch)).size, 3, "不同事件的后续关注不能完全相同");
const researchItem = candidate({
    id: "research",
    title: "高温超导材料研究取得新进展",
    sourceLink: source("cas-science-news", "https://example.com/research"),
    categories: ["technology", "education"]
});
const researchCard = (0, articleDetails_1.enrichCandidateWithArticleDetail)(researchItem, detail(researchItem, researchItem.title, "研究团队公布了高温超导材料的新实验结果，并说明了样品制备和测量方法。实验展示了材料在不同温度与磁场条件下的性能变化。后续仍需要独立团队复现，并验证更大尺寸样品的稳定性和工程应用条件。"));
assert.match(researchCard.body.whatToWatch ?? "", /论文全文|实验条件/u, "科研新闻不能套用政策执行细则模板");
console.log("Content quality regression checks passed.");
