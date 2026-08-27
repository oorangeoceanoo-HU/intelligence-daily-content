"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const articleDetails_1 = require("../src/content/articleDetails");
const cardDraftQuality_1 = require("../src/content/cardDraftQuality");
const cardDraftRepair_1 = require("../src/content/cardDraftRepair");
const candidateDeduper_1 = require("../src/content/candidateDeduper");
const rawToCandidate_1 = require("../src/content/rawToCandidate");
const candidateGenerator_1 = require("../src/content/candidateGenerator");
const candidatePreviewProfiles_1 = require("../src/content/candidatePreviewProfiles");
const personalizedIssue_1 = require("../src/content/personalizedIssue");
const rawFetchers_1 = require("../src/content/rawFetchers");
const translation_1 = require("../src/content/translation");
const nodeRequire = typeof require === "function" ? require : undefined;
if (!nodeRequire) {
    throw new Error("Node runtime is required");
}
const assert = nodeRequire("node:assert/strict");
assert.equal((0, translation_1.normalizeChineseTranslation)("Japanese automakers face a 一二拳 and a 7B+美元 deal"), "Japanese automakers face a 双重冲击 and a 70亿美元以上 deal", "literal machine translations are normalized before becoming card text");
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
    industries: params.industries ?? ["generalPublic", "technologyEngineering"],
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
    categories: ["world", "policy"],
    impactScore: 92
});
assert.equal((0, candidateDeduper_1.dedupeCandidateItems)([hormuzQuestion, hormuzStatement]).candidates.length, 1, "同一天同一国际事件的问答和快讯不能重复进入日报");
const publicProfile = candidatePreviewProfiles_1.candidatePreviewProfiles.find((item) => item.name === "多职业公共版")?.profile;
if (!publicProfile) {
    throw new Error("必须存在公共版画像用于重大事件回归检查");
}
const hormuzMerged = (0, candidateDeduper_1.dedupeCandidateItems)([hormuzQuestion, hormuzStatement]).candidates[0];
assert.ok(hormuzMerged.title.includes("击败伊朗"), "重大国际事件应优先保留局势变化标题，而不是问答标题");
assert.equal((0, candidateGenerator_1.rankCandidateForProfile)(hormuzMerged, publicProfile).importanceScore.level, "S", "涉及战争与霍尔木兹海峡的国际事件必须触发重大事件保底等级");
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
    ...params,
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
const translatedHormuz = rawItem({
    id: "translated-hormuz",
    sourceId: "cnbc-world-rss",
    title: "美伊停火到期前霍尔木兹海峡航运陷入停滞",
    summaryFromSource: "霍尔木兹海峡商业航运几乎停止，市场关注能源供应与停火是否延续。",
    rawText: "美伊停火期限临近，航运、油价和地区冲突风险同步上升。",
    publishedAt: "2026-08-17T13:30:00+08:00",
    language: "zh",
    originalLanguage: "en",
    translationStatus: "translated"
});
const translatedHormuzCandidate = (0, rawToCandidate_1.rawItemToCandidate)(translatedHormuz);
assert.ok(translatedHormuzCandidate, "翻译后的重大英文新闻仍应生成候选");
assert.equal((0, candidateGenerator_1.rankCandidateForProfile)(translatedHormuzCandidate, publicProfile).importanceScore.level, "S", "英文来源翻译成中文后，重大冲突和霍尔木兹关键词仍必须触发 S 级保底");
const cityServiceCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "hangzhou-service",
    sourceId: "city-news-rss:%E4%B8%AD%E5%9B%BD-%E6%9D%AD%E5%B7%9E",
    title: "杭州加快推进农村生活污水治理扩面提质",
    summaryFromSource: "杭州公布农村生活污水治理进度，重点涉及设施改造和长效运维。",
    localCity: "杭州"
}));
assert.ok(!cityServiceCandidate.categories.includes("publicSafety"), "普通城市发展消息不能默认标成公共安全风险");
assert.equal((0, candidateGenerator_1.rankCandidateForProfile)(cityServiceCandidate, publicProfile).targetSection, "local", "普通城市发展消息应进入本地板块");
const cityRiskCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "hangzhou-typhoon",
    sourceId: "city-news-rss:%E4%B8%AD%E5%9B%BD-%E6%9D%AD%E5%B7%9E",
    title: "杭州发布台风暴雨橙色预警",
    summaryFromSource: "杭州气象部门发布台风暴雨预警，部分道路可能临时封闭。",
    localCity: "杭州"
}));
assert.ok(cityRiskCandidate.categories.includes("publicSafety"), "真正的城市预警仍应进入风险通道");
assert.equal((0, candidateGenerator_1.rankCandidateForProfile)(cityRiskCandidate, publicProfile).targetSection, "risk", "城市灾害预警应进入风险板块");
assert.equal((0, rawFetchers_1.isUsefulCityDiscoveryItem)("16省青年“行走杭州”掀起实践热潮", "https://example.com/hangzhou-youth", "杭州"), false, "普通城市活动不应占用本地政策和风险日报位置");
assert.equal((0, rawFetchers_1.isUsefulCityDiscoveryItem)("杭州加快推进农村生活污水治理扩面提质", "https://example.com/hangzhou-water", "杭州"), true, "城市治理和公共服务变化应保留在本地候选池");
const cityOfficialCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "hangzhou-highway",
    sourceId: "city-news-rss:%E4%B8%AD%E5%9B%BD-%E6%9D%AD%E5%B7%9E",
    title: "杭淳开高速公路杭州段迎来新进展",
    url: "https://www.hangzhou.gov.cn/col/col812269/art/2026/example.html",
    summaryFromSource: "杭州市政府公布高速项目施工进展。",
    localCity: "杭州"
}));
assert.equal((0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(cityOfficialCandidate, publicProfile), "2026-08-17T00:00:00.000Z").credibility, "官方来源", "来自政府官网的城市动态应显示为官方来源");
const cultureCandidate = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "italian-art",
    sourceId: "npr-world-rss",
    title: "对于意大利艺术警察和博物馆保安来说，这是好事和坏事的一周",
    summaryFromSource: "意大利博物馆发生艺术品失窃和找回事件。"
}));
assert.ok(!(0, candidateGenerator_1.rankCandidateForProfile)(cultureCandidate, publicProfile).matchedLaneIds.includes("industry"), "普通国际文化报道不能仅因为公共版包含运营标签就被当成行业信息");
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
const conciseOfficialRiskCard = {
    id: "concise-official-risk",
    title: "应急管理部调派排涝力量支援河南周口",
    oneLine: "风险提醒：13支排涝力量已抵达河南周口并投入作业，总排涝能力约22万立方米每小时。",
    importance: "B",
    credibility: "官方来源",
    tags: ["B", "risk", "disaster", "publicSafety"],
    industries: ["generalPublic", "localLife"],
    section: "risk",
    body: {
        background: "河南周口部分区域需要开展排涝，应急管理部从多个省份调派专业力量支援。",
        keyProgress: "相关队伍已于上午全部抵达并投入作业，后续重点是积水消退、交通恢复和新的降雨变化。",
        whyItMatters: "排涝进展直接关系当地居民出行、交通和生产恢复，受影响地区应继续查看本地官方通知。",
        userRelevance: "如果你在河南周口或近期计划前往当地，应优先确认道路积水和公共交通恢复情况。",
        whatToWatch: "继续关注当地降雨、积水点变化和交通恢复通知。"
    },
    sourceLinks: [source("mem-cn", "https://example.com/concise-official-risk")],
    images: [],
    generatedAt: "2026-08-17T00:00:00.000Z"
};
const conciseOfficialRiskDetail = detail(candidate({
    id: conciseOfficialRiskCard.id,
    title: conciseOfficialRiskCard.title,
    sourceLink: conciseOfficialRiskCard.sourceLinks[0]
}), conciseOfficialRiskCard.title, "应急管理部调派13支专业排涝力量支援河南周口，队伍已抵达现场并投入作业。相关力量来自多个省份，总排涝能力约22万立方米每小时。");
const conciseOfficialRiskReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(conciseOfficialRiskCard, conciseOfficialRiskDetail);
assert.equal(conciseOfficialRiskReport.level, "review", "完整的官方风险简报应进入人工复核而不是直接拦截");
assert.ok(!conciseOfficialRiskReport.issues.some((issue) => issue.code === "detail-too-short"), "官方风险简报不应被普通短正文规则直接拦截");
const repeatedOfficialRiskCard = {
    ...conciseOfficialRiskCard,
    id: "repeated-official-risk",
    oneLine: conciseOfficialRiskCard.body.background,
    body: {
        ...conciseOfficialRiskCard.body,
        background: conciseOfficialRiskCard.body.background
    }
};
const repeatedOfficialRiskReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(repeatedOfficialRiskCard);
assert.ok(repeatedOfficialRiskReport.issues.some((issue) => issue.code === "lead-background-repetition"), "官方风险简报的导读与背景重复必须被识别");
const repairedOfficialRisk = (0, cardDraftRepair_1.repairCardDraft)(repeatedOfficialRiskCard, repeatedOfficialRiskReport);
assert.ok(repairedOfficialRisk.changed, "重复的官方风险简报应自动压缩背景");
assert.ok(!repairedOfficialRisk.repairedReport.issues.some((issue) => issue.code === "lead-background-repetition"), "压缩后不应保留导读与背景重复问题");
const lowOverlapLeadCard = {
    ...conciseOfficialRiskCard,
    id: "low-overlap-lead",
    title: "库什纳在与内塔尼亚胡会谈之前会见哈马斯，讨论加沙路线图",
    oneLine: "政策变化：一名地区官员证实了在埃及举行的罕见会面。",
    body: {
        ...conciseOfficialRiskCard.body,
        background: "加沙停火谈判长期陷入僵局，重建与人道援助仍受局势影响。",
        keyProgress: "美国谈判代表库什纳在埃及会见哈马斯领导人，尝试推动加沙停火计划取得进展。"
    }
};
const lowOverlapLeadReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(lowOverlapLeadCard);
assert.ok(lowOverlapLeadReport.issues.some((issue) => issue.code === "title-lead-low-overlap"), "标题与导读的事件对应关系不足时必须进入修复流程");
const repairedLowOverlapLead = (0, cardDraftRepair_1.repairCardDraft)(lowOverlapLeadCard, lowOverlapLeadReport);
assert.match(repairedLowOverlapLead.card.oneLine, /库什纳/u, "修复后的导读必须明确标题中的事件主体");
const newsletterCard = {
    ...conciseOfficialRiskCard,
    id: "newsletter-intro",
    title: "CNBC每日开盘：美伊停火即将到期",
    oneLine: "政策变化：大家好，我是编辑，从伦敦为您整理今天的市场开盘信息。",
    sourceLinks: [source("cnbc-world-rss", "https://example.com/newsletter-intro")]
};
const newsletterReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(newsletterCard, detail(candidate({
    id: newsletterCard.id,
    title: newsletterCard.title,
    sourceLink: newsletterCard.sourceLinks[0]
}), newsletterCard.title, "这是一份每日简报的主持人开场，随后罗列多个市场主题，但没有围绕一个具体新闻事件说明事实、变化和影响。正文长度足够，但不应代替一张事件卡片进入日报。"));
assert.ok(newsletterReport.issues.some((issue) => issue.code === "newsletter-or-host-intro"), "新闻简报开场白必须被内容质量门识别");
const navigationNoiseCard = {
    ...conciseOfficialRiskCard,
    id: "navigation-noise",
    title: "叙利亚居民开始清理废墟并重建生活",
    oneLine: "国际进展：其他印地语、和平与安全、经济发展、人道主义援助、秘书长发言人等导航文字混入了正文。",
    sourceLinks: [source("un-news-rss", "https://example.com/navigation-noise")]
};
const navigationNoiseReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(navigationNoiseCard, detail(candidate({
    id: navigationNoiseCard.id,
    title: navigationNoiseCard.title,
    sourceLink: navigationNoiseCard.sourceLinks[0]
}), navigationNoiseCard.title, "叙利亚当地居民参与清理废墟和恢复社区服务。报道记录了住房、供水和教育设施的重建情况，并说明仍有大量基础设施需要修复。后续需要关注人道援助和地方治理能否持续。"));
assert.ok(navigationNoiseReport.issues.some((issue) => issue.code === "obvious-web-noise"), "联合国页面导航文字不能进入正式卡片");
const mediaChromeNoiseCard = {
    ...conciseOfficialRiskCard,
    id: "media-chrome-noise",
    title: "一家 AI 公司宣布新的模型安全调整",
    oneLine: "趋势信号：TechCrunch 品牌工作室、图片说明和网站导航文字混入了事件摘要。",
    body: {
        ...conciseOfficialRiskCard.body,
        background: "文章正文应只保留这家公司公布的模型安全调整和实际影响。",
        keyProgress: "hide caption 网站图片说明不应与新闻事实一起进入日报。"
    }
};
assert.ok((0, cardDraftQuality_1.evaluateCardDraftQuality)(mediaChromeNoiseCard).issues.some((issue) => issue.code === "obvious-web-noise"), "媒体品牌栏目和图片说明噪音必须在发布前被拦截");
const playerPromptNoiseCard = {
    ...conciseOfficialRiskCard,
    id: "player-prompt-noise",
    title: "中东局势出现新的外交进展",
    oneLine: "风险提醒：Manage my choices. Your browser extension is blocking the video player.",
    body: {
        ...conciseOfficialRiskCard.body,
        background: "播放器隐私提示不能作为国际新闻的背景。",
        keyProgress: "启用广告跟踪后才能观看视频播放器。"
    }
};
assert.ok((0, cardDraftQuality_1.evaluateCardDraftQuality)(playerPromptNoiseCard).issues.some((issue) => issue.code === "obvious-web-noise"), "视频播放器或隐私设置提示必须在发布前被拦截");
const narrativeFeatureCard = {
    ...conciseOfficialRiskCard,
    id: "narrative-feature",
    title: "第一人称：叙利亚人带头清理废墟并重建生活",
    oneLine: "国际进展：当地居民正在参与清理废墟和恢复社区生活。",
    body: {
        ...conciseOfficialRiskCard.body,
        background: "报道记录了当地居民在冲突过后参与社区清理和恢复基础服务的经历。",
        keyProgress: "这是一篇以个人经历为主的背景专题，缺少当天发生的新政策、新风险或局势变化。"
    }
};
assert.ok((0, cardDraftQuality_1.evaluateCardDraftQuality)(narrativeFeatureCard).issues.some((issue) => issue.code === "narrative-feature"), "第一人称背景专题不能作为当日新闻事件进入日报");
const translatedMismatchCard = {
    ...conciseOfficialRiskCard,
    id: "translated-title-mismatch",
    title: "休达到底发生了什么？为什么我们可能永远不会发现",
    oneLine: "核心信息：摩洛哥和西班牙边境部署了大量警察和军队。",
    body: {
        ...conciseOfficialRiskCard.body,
        background: "边境发生的事件总是有原因的。",
        keyProgress: "西班牙正试图结束这一章。"
    }
};
const translatedMismatchReport = (0, cardDraftQuality_1.evaluateCardDraftQuality)(translatedMismatchCard);
assert.equal(translatedMismatchReport.level, "blocked", "中文化后标题与正文不一致的卡片必须拦截");
assert.ok(translatedMismatchReport.issues.some((issue) => issue.code === "title-content-mismatch"), "中文化后标题与正文不一致的问题必须被明确记录");
const englishConflict = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "english-conflict",
    sourceId: "cnbc-world-rss",
    title: "Iran says the US blocked a Hormuz agreement during talks with Oman",
    summaryFromSource: "The diplomatic dispute is still developing."
}));
assert.ok(!englishConflict.industries.includes("operationsGrowth"), "普通国际冲突不能因为来自商业媒体就被标成运营行业");
assert.ok(!englishConflict.industries.includes("financeInvestment"), "普通国际冲突不能因为来自商业媒体就被标成金融行业");
const ukSchoolNotice = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "uk-school-notice",
    sourceId: "gov-uk-news",
    title: "Notice: Southfield Primary School",
    summaryFromSource: "The school published a local term-time notice for families."
}));
assert.ok(!ukSchoolNotice.industries.includes("hrRecruiting"), "学校通知不能被误标为招聘行业");
const disasterWithoutIndustry = (0, rawToCandidate_1.rawItemToCandidate)(rawItem({
    id: "domestic-disaster",
    sourceId: "mem-cn",
    title: "Emergency management department starts a national geological disaster response for Zhejiang"
}));
assert.ok(!disasterWithoutIndustry.industries.includes("operationsGrowth"), "国内灾害响应不能占用运营行业卡片名额");
const broadOperationsCandidate = candidate({
    id: "broad-international-operations",
    title: "国际冲突继续升级并影响地区安全预期",
    categories: ["world", "policy", "operations"],
    industries: ["generalPublic", "operationsGrowth"],
    sourceLink: source("cnbc-world-rss", "https://example.com/broad-international-operations")
});
const broadOperationsCard = (0, candidateGenerator_1.rankedCandidateToCard)((0, candidateGenerator_1.rankCandidateForProfile)(broadOperationsCandidate, {
    country: "中国",
    livingCity: "上海",
    hometownCountry: "中国",
    hometownCity: "杭州",
    careerDirections: ["运营 / 增长"],
    interests: ["运营增长"]
}), "2026-08-17T00:00:00.000Z");
const broadOperationsResult = (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
    userId: "operations-quality",
    profile: {
        country: "中国",
        livingCity: "上海",
        hometownCountry: "中国",
        hometownCity: "杭州",
        careerDirections: ["运营 / 增长"],
        interests: ["运营增长"]
    },
    preferences: {},
    pool: [{ candidate: broadOperationsCandidate, card: broadOperationsCard }],
    date: "2026-08-17",
    edition: "morning",
    editionLabel: "晨间版",
    generatedAt: "2026-08-17T00:00:00.000Z",
    minimumCards: 1,
    comfortableMaxCards: 1,
    absoluteMaxCards: 1
});
assert.equal(broadOperationsResult.summary.industryCardCount, 0, "泛国际新闻不能被运营画像当作行业卡片");
console.log("Content quality regression checks passed.");
