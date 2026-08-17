"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawItemToCandidate = rawItemToCandidate;
exports.rawItemsToCandidates = rawItemsToCandidates;
const sourceRegistry_1 = require("./sourceRegistry");
const unique = (items) => Array.from(new Set(items));
const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));
const textOf = (item) => `${item.title} ${item.summaryFromSource ?? ""} ${item.rawText ?? ""}`.toLowerCase();
const compact = (value, maxLength = 180) => {
    const normalized = (value ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) {
        return "";
    }
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, maxLength).trim()}...`;
};
const sourceName = (sourceId) => sourceRegistry_1.sourceRegistry.find((source) => source.id === sourceId)?.name ?? sourceId;
const freshnessScore = (publishedAt, fetchedAt) => {
    if (!publishedAt) {
        return 28;
    }
    const published = new Date(publishedAt ?? fetchedAt ?? Date.now()).getTime();
    if (Number.isNaN(published)) {
        return 60;
    }
    const ageHours = Math.max(0, (Date.now() - published) / 36e5);
    if (ageHours <= 24) {
        return 95;
    }
    if (ageHours <= 72) {
        return 82;
    }
    if (ageHours <= 168) {
        return 68;
    }
    return 48;
};
const hasAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword.toLowerCase()));
const extractLocations = (item) => {
    const sourceText = `${item.title} ${item.summaryFromSource ?? ""} ${item.rawText ?? ""}`;
    const matches = [];
    const locationMap = [
        ["China", "中国"],
        ["Chinese", "中国"],
        ["Philippines", "菲律宾"],
        ["Guatemala", "危地马拉"],
        ["Japan", "日本"],
        ["Indonesia", "印度尼西亚"],
        ["India", "印度"],
        ["United States", "美国"],
        ["US ", "美国"],
        ["Iran", "伊朗"],
        ["Israel", "以色列"],
        ["Gaza", "加沙"],
        ["Ukraine", "乌克兰"],
        ["Russia", "俄罗斯"],
        ["Japan", "日本"],
        ["South Korea", "韩国"],
        ["France", "法国"],
        ["Germany", "德国"],
        ["United Kingdom", "英国"],
        ["Turkey", "土耳其"],
        ["Saudi Arabia", "沙特"],
        ["Colombia", "哥伦比亚"],
        ["Venezuela", "委内瑞拉"],
        ["Spain", "西班牙"],
        ["Italy", "意大利"],
        ["Hungary", "匈牙利"],
        ["Yemen", "也门"],
        ["South Sudan", "南苏丹"],
        ["Hormuz", "霍尔木兹海峡"],
        ["EU", "欧盟"],
        ["Europe", "欧洲"],
        ["Shanghai", "上海"],
        ["Hangzhou", "杭州"],
        ["Beijing", "北京"],
        ["Guangzhou", "广州"],
        ["Shenzhen", "深圳"]
    ];
    const chinaLocationMap = [
        "北京",
        "上海",
        "天津",
        "重庆",
        "河北",
        "山西",
        "辽宁",
        "吉林",
        "黑龙江",
        "江苏",
        "浙江",
        "安徽",
        "福建",
        "江西",
        "山东",
        "河南",
        "湖北",
        "湖南",
        "广东",
        "海南",
        "四川",
        "贵州",
        "云南",
        "陕西",
        "甘肃",
        "青海",
        "台湾",
        "内蒙古",
        "广西",
        "西藏",
        "宁夏",
        "新疆",
        "香港",
        "澳门",
        "汕尾"
    ];
    locationMap.forEach(([needle, label]) => {
        if (sourceText.includes(needle) || sourceText.includes(label)) {
            matches.push(label);
        }
    });
    chinaLocationMap.forEach((label) => {
        if (sourceText.includes(label)) {
            matches.push(label);
        }
    });
    return unique(matches);
};
const affectedPopulation = (item) => {
    const text = `${item.title} ${item.summaryFromSource ?? ""}`;
    const match = text.match(/([\d.]+)\s*(thousand|million|billion)/i);
    if (!match) {
        return 0;
    }
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(value)) {
        return 0;
    }
    if (unit === "billion") {
        return value * 1_000_000_000;
    }
    if (unit === "million") {
        return value * 1_000_000;
    }
    return value * 1_000;
};
const disasterSeverity = (item) => {
    const text = textOf(item);
    let score = 52;
    if (/\bred\b/i.test(text)) {
        score = 92;
    }
    else if (/\borange\b/i.test(text)) {
        score = 78;
    }
    else if (/\bgreen\b/i.test(text)) {
        score = 48;
    }
    const magnitudeMatch = text.match(/magnitude\s*([\d.]+)/i);
    if (magnitudeMatch) {
        const magnitude = Number(magnitudeMatch[1]);
        if (magnitude >= 7) {
            score += 24;
        }
        else if (magnitude >= 6) {
            score += 14;
        }
        else if (magnitude >= 5) {
            score += 6;
        }
    }
    const affected = affectedPopulation(item);
    if (affected >= 1_000_000) {
        score += 18;
    }
    else if (affected >= 100_000) {
        score += 10;
    }
    return clampScore(score);
};
const disasterImpact = (item) => {
    const affected = affectedPopulation(item);
    if (affected >= 5_000_000) {
        return 88;
    }
    if (affected >= 1_000_000) {
        return 80;
    }
    if (affected >= 100_000) {
        return 70;
    }
    return 58;
};
const arxivTrendScore = (item) => {
    const text = textOf(item);
    let score = 68;
    if (hasAny(text, ["agent", "runtime", "reasoning", "long-horizon", "benchmark"])) {
        score += 10;
    }
    if (hasAny(text, ["multimodal", "video", "robot", "medical", "education", "security"])) {
        score += 8;
    }
    if (hasAny(text, ["gpt", "llm", "language model", "long-context", "code"])) {
        score += 8;
    }
    return clampScore(score);
};
const gdeltProfile = (item) => {
    const text = textOf(item);
    const categories = ["world"];
    const industries = ["generalPublic"];
    let oneLine = "这是一条全球新闻发现候选，需要后续用官方或多家主流来源确认后再进入日报。";
    let trendScore = 55;
    let impactScore = 62;
    let severityScore = 38;
    if (hasAny(text, ["ai", "artificial intelligence", "nvidia", "model", "openai"])) {
        categories.push("ai", "technology");
        industries.push("aiProduct", "aiTechnology", "technologyEngineering");
        oneLine = "这条新闻线索与 AI / 技术趋势有关，适合先进入候选池，再判断是否足够重要。";
        trendScore = 76;
        impactScore = 68;
    }
    if (hasAny(text, ["war", "conflict", "tariff", "sanction", "policy", "election"])) {
        categories.push("policy");
        impactScore = 76;
        severityScore = 64;
    }
    return {
        categories: unique(categories),
        industries: unique(industries),
        regions: ["全球"],
        locations: extractLocations(item),
        impactScore,
        severityScore,
        trendScore,
        oneLine,
        body: {
            background: "GDELT 适合作为新闻发现层，它可以帮助系统先发现全球媒体正在报道什么。",
            keyProgress: compact(item.summaryFromSource || item.title),
            whyItMatters: "这类内容进入日报前，还需要做多源确认和用户相关性判断，避免单一线索被误当成确定事实。",
            userRelevance: "如果它命中用户国家、行业或临时关注，后续排序会提高。",
            whatToWatch: "下一步应补充官方来源或至少两个可靠来源，确认事件是否成立。"
        }
    };
};
const arxivProfile = (item) => {
    const trendScore = arxivTrendScore(item);
    const communicationRelated = hasAny(textOf(item), [
        "wireless",
        "communication",
        "network",
        "signal processing",
        "spectrum",
        "channel",
        "mimo",
        "6g"
    ]);
    return {
        categories: ["ai", "technology"],
        industries: communicationRelated
            ? ["communicationsResearch", "technologyEngineering", "educationResearch"]
            : ["aiTechnology", "technologyEngineering", "educationResearch", "aiProduct"],
        regions: ["全球"],
        locations: [],
        impactScore: trendScore >= 82 ? 72 : 62,
        severityScore: 18,
        trendScore,
        oneLine: communicationRelated
            ? "这是一条通信 / 网络研究候选，重点看方法、实验指标、可复现性和潜在工程应用。"
            : "这是一条 AI / 计算机科学研究候选，适合用于发现技术趋势，但还需要判断是否足够影响产品或行业。",
        body: {
            background: "arXiv 提供的是研究论文元数据，能帮助我们看到 AI 和计算机科学方向的新研究。",
            keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
            whyItMatters: "论文不等于大众新闻，但如果它涉及模型能力、智能体、长上下文、代码生成等方向，可能会影响后续产品和技术判断。",
            userRelevance: "对 AI 产品、AI 技术、技术研发和教育研究类用户更相关。",
            whatToWatch: "后续需要观察是否有开源代码、行业引用、公司应用或主流媒体跟进。"
        }
    };
};
const gdacsProfile = (item) => {
    const locations = extractLocations(item);
    const severityScore = disasterSeverity(item);
    const impactScore = disasterImpact(item);
    return {
        categories: ["disaster", "publicSafety", "world"],
        industries: ["generalPublic", "localLife"],
        regions: ["全球"],
        locations,
        impactScore,
        severityScore,
        trendScore: 24,
        oneLine: "这是一条全球灾害 / 公共风险候选，是否推送取决于事件严重程度、影响范围和用户所在地相关性。",
        body: {
            background: "GDACS 提供接近实时的自然灾害提醒，适合作为公共风险信息的候选来源。",
            keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
            whyItMatters: "灾害信息主要服务于风险提醒。绿色级别事件通常不应制造焦虑，只有影响范围或用户相关性足够高时才进入日报。",
            userRelevance: locations.length
                ? `当前候选识别到地点：${locations.join("、")}。如果用户与这些地区相关，排序会提高。`
                : "当前还没有命中用户城市，需要继续结合地区和严重程度判断。",
            whatToWatch: "后续应结合官方预警、当地影响和事件等级变化再决定是否推送。"
        }
    };
};
const moeProfile = (item) => ({
    categories: ["education", "policy", "china"],
    industries: ["teacher", "educationResearch", "generalPublic"],
    regions: ["中国"],
    locations: extractLocations(item),
    impactScore: 66,
    severityScore: 20,
    trendScore: 58,
    oneLine: "这是一条教育 / 教师方向候选，适合用于发现教育政策、学校治理、学生发展和高校毕业生相关动态。",
    body: {
        background: "教育部来源适合作为教师、教育从业者和教育研究用户的官方信息底座。",
        keyProgress: compact(item.title),
        whyItMatters: "这类信息可能影响教学安排、学校治理、学生培养、职教专业设置或高校毕业生就业等判断。",
        userRelevance: "对教师、教育行业、教育研究和关注学生就业的用户更相关。",
        whatToWatch: "后续需要结合政策正文、地方教育部门执行细则和学校实际影响判断是否进入日报。"
    }
});
const chrmProfile = (item) => {
    const locations = extractLocations(item);
    return {
        categories: ["hr", "policy", "china"],
        industries: ["hrRecruiting", "generalPublic", "teacher"],
        regions: ["中国"],
        locations,
        impactScore: locations.includes("上海") || locations.includes("浙江") ? 76 : 70,
        severityScore: 28,
        trendScore: 68,
        oneLine: "这是一条 HR / 招聘 / 就业方向候选，适合用于发现招聘公告、人才目录、就业服务和毕业生相关政策。",
        body: {
            background: "中国人力资源市场网汇集招聘、人才目录和就业相关公告，适合作为 HR 与招聘用户的行业候选来源。",
            keyProgress: compact(item.title),
            whyItMatters: "这类信息可能影响招聘需求、人才供给、地方紧缺职业、毕业生就业服务和用工判断。",
            userRelevance: locations.length
                ? `当前候选识别到地区：${locations.join("、")}。如果用户在这些地区或关注 HR / 招聘，排序会提高。`
                : "对 HR / 招聘、人社政策和就业服务关注者更相关。",
            whatToWatch: "后续可结合地方人社局原文、职位目录和执行周期判断是否需要进入日报。"
        }
    };
};
const statsDataProfile = (item) => {
    const text = `${item.title} ${item.summaryFromSource ?? ""}`;
    const categories = ["china", "consumer", "operations", "finance"];
    const industries = ["operationsGrowth", "consumerBrand", "financeInvestment", "ecommerceRetail", "generalPublic"];
    let impactScore = 70;
    let trendScore = 72;
    if (/采购经理|PMI|工业企业|利润|价格|生产资料/.test(text)) {
        impactScore = 74;
        trendScore = 76;
    }
    if (/消费|零售|服务业|文化/.test(text)) {
        impactScore = 76;
        trendScore = 80;
    }
    return {
        categories: unique(categories),
        industries: unique(industries),
        regions: ["中国"],
        locations: extractLocations(item),
        impactScore,
        severityScore: 18,
        trendScore,
        oneLine: "这是一条运营 / 消费 / 市场数据候选，适合用于判断消费趋势、行业景气度和经营环境变化。",
        body: {
            background: "国家统计局数据适合作为运营、消费品牌、电商和金融用户判断市场环境的事实底座。",
            keyProgress: compact(item.title),
            whyItMatters: "消费、价格、PMI、企业利润和服务业数据会影响运营节奏、选品判断、投放策略和行业预期。",
            userRelevance: "对运营增长、消费品牌、电商零售、金融投资和关注宏观变化的用户更相关。",
            whatToWatch: "后续应结合数据解读、行业细分和企业动作，判断这条数据是否需要进入日报。"
        }
    };
};
const mofcomConsumptionProfile = (item) => {
    const text = `${item.title} ${item.summaryFromSource ?? ""}`;
    const categories = ["consumer", "operations", "policy", "china"];
    const industries = ["operationsGrowth", "consumerBrand", "ecommerceRetail", "startupBusiness", "generalPublic"];
    if (/电商|电子商务/.test(text)) {
        categories.push("ecommerce");
    }
    return {
        categories: unique(categories),
        industries: unique(industries),
        regions: ["中国"],
        locations: extractLocations(item),
        impactScore: /规划|通知|政策|试点|名单|批复/.test(text) ? 76 : 68,
        severityScore: 16,
        trendScore: /消费|汽车|电商|流通|服务消费|首发|以旧换新/.test(text) ? 82 : 70,
        oneLine: "这是一条运营 / 消费 / 电商方向候选，适合用于发现消费促进、市场运行和流通政策变化。",
        body: {
            background: "商务部市场运行和消费促进相关来源，适合观察消费政策、流通体系、服务消费和电商方向变化。",
            keyProgress: compact(item.title),
            whyItMatters: "这类信息可能影响消费活动、平台运营、品牌投放、线下商业和电商经营判断。",
            userRelevance: "对运营增长、消费品牌、电商零售、创业商业和内容创作用户更相关。",
            whatToWatch: "后续应关注是否有试点城市、执行细则、平台动作或消费数据跟进。"
        }
    };
};
const govPolicyProfile = (item) => {
    const text = textOf(item);
    const categories = ["policy", "china"];
    const industries = ["generalPublic"];
    if (hasAny(text, ["人工智能", "算法", "数据", "网络", "集成电路", "知识产权", "科技"])) {
        categories.push("ai", "technology");
        industries.push("aiProduct", "aiTechnology", "productManagement", "technologyEngineering");
    }
    if (hasAny(text, ["就业", "社保", "人才", "劳动"])) {
        categories.push("hr");
        industries.push("hrRecruiting");
    }
    if (hasAny(text, ["教育", "学校", "教师", "学生"])) {
        categories.push("education");
        industries.push("teacher", "educationResearch");
    }
    if (hasAny(text, ["消费", "外贸", "营商", "产业", "金融", "税"])) {
        categories.push("operations", "finance");
        industries.push("operationsGrowth", "consumerBrand", "financeInvestment", "ecommerceRetail", "startupBusiness");
    }
    return {
        categories: unique(categories),
        industries: unique(industries),
        regions: ["中国"],
        locations: extractLocations(item),
        impactScore: /中共中央|国务院/.test(item.title) ? 86 : 78,
        severityScore: 35,
        trendScore: 72,
        oneLine: "这是一条国务院层面的最新政策候选，需要从适用范围、执行时间和对个人或行业的影响三个方面提炼。",
        body: {
            background: "中国政府网最新政策库用于确认国务院和中央层面的正式政策文件。",
            keyProgress: compact(item.title),
            whyItMatters: "重要政策可能改变个人办事规则、行业经营条件或中长期发展方向，适合进入必须知道或行业重点。",
            userRelevance: "系统会结合政策涉及的国家、城市、身份和行业标签决定展示权重。",
            whatToWatch: "后续重点看执行日期、适用对象、配套细则和地方落实安排。"
        }
    };
};
const memProfile = (item) => {
    const text = textOf(item);
    const locations = extractLocations(item);
    const severe = hasAny(text, ["一级应急响应", "二级应急响应", "重大", "特大", "死亡", "失联"]);
    return {
        categories: ["disaster", "publicSafety", "china", "local"],
        industries: ["generalPublic", "localLife", "operationsGrowth"],
        regions: ["中国"],
        locations,
        impactScore: severe ? 88 : locations.length > 1 ? 80 : 72,
        severityScore: severe ? 88 : /三级应急响应|四级应急响应/.test(item.title) ? 70 : 62,
        trendScore: 28,
        oneLine: "这是一条国内灾害或公共安全候选，重点判断响应等级、影响地区和是否需要用户采取风险防范措施。",
        body: {
            background: "应急管理部信息用于确认国内防汛、防台风、地质灾害、救灾和安全生产响应。",
            keyProgress: compact(item.title),
            whyItMatters: "这类信息的核心价值是避免风险；只有影响范围、严重程度或用户城市相关性足够高时才应提高推送级别。",
            userRelevance: locations.length
                ? `当前识别到相关地区：${locations.join("、")}。命中居住城市、家乡城市或临时关注城市时会提高排序。`
                : "当前未识别到用户城市，需要继续核对官方影响范围。",
            whatToWatch: "后续关注响应等级、预警范围、交通影响、人员转移和官方防护建议是否变化。"
        }
    };
};
const cacProfile = (item) => {
    const text = `${item.title} ${item.rawText ?? ""}`.toLowerCase();
    const aiRelated = hasAny(text, ["人工智能", "生成式", "算法", "深度合成", "大模型", "数据", "个人信息"]);
    const categories = ["policy", "china"];
    const industries = ["contentCreator", "generalPublic"];
    if (aiRelated) {
        categories.push("ai", "technology");
        industries.push("aiProduct", "aiTechnology", "productManagement", "technologyEngineering");
    }
    else {
        categories.push("operations");
        industries.push("operationsGrowth", "productManagement");
    }
    return {
        categories: unique(categories),
        industries: unique(industries),
        regions: ["中国"],
        locations: extractLocations(item),
        impactScore: /法律|条例|规定|管理办法|国家标准/.test(item.title) ? 84 : 76,
        severityScore: 35,
        trendScore: aiRelated ? 82 : 58,
        oneLine: "这是一条数据、平台治理或网络安全政策候选，需要说明它改变了哪些规则以及哪些产品或用户会受到影响。",
        body: {
            background: "国家网信办是算法、数据、个人信息、网络安全和互联网平台治理的重要官方来源。",
            keyProgress: compact(item.title),
            whyItMatters: "网信政策可能直接影响产品设计、内容运营、数据处理、平台审核和用户权益保护。",
            userRelevance: aiRelated
                ? "对 AI 产品、技术研发、产品经理、内容创作和互联网运营用户更相关。"
                : "对互联网用户、内容创作者、平台运营和产品经理更相关。",
            whatToWatch: "后续重点看征求意见截止时间、正式生效日期、适用平台和配套国家标准。"
        }
    };
};
const xinhuaWorldProfile = (item) => {
    const text = textOf(item);
    const locations = extractLocations(item);
    const categories = ["world"];
    const historicalFeature = hasAny(text, [
        "周年",
        "重访",
        "历史",
        "遗址",
        "纪念",
        "博物馆",
        "死亡铁路"
    ]);
    const activePublicRisk = !historicalFeature &&
        /地震|洪水|台风|山火|爆炸|危机|干旱|已致\d+人死亡|造成\d+人(?:死亡|受伤)|多人(?:死亡|受伤)/u.test(text);
    const systemicInternationalEvent = hasAny(text, [
        "战争",
        "冲突升级",
        "霍尔木兹",
        "海峡通航",
        "关税",
        "制裁",
        "总统更迭",
        "政变",
        "核设施",
        "能源供应",
        "航运中断"
    ]);
    let impactScore = 74;
    let severityScore = 55;
    if (historicalFeature) {
        categories.push("lightTrend");
        impactScore = 56;
        severityScore = 18;
    }
    else if (hasAny(text, ["战争", "冲突", "停火", "袭击", "军事", "防务", "制裁", "关税", "法案", "政府", "选举", "霍尔木兹", "海峡"])) {
        categories.push("policy");
        impactScore = systemicInternationalEvent ? 92 : 82;
        severityScore = systemicInternationalEvent ? 78 : 68;
    }
    if (activePublicRisk) {
        categories.push("disaster", "publicSafety");
        impactScore = 86;
        severityScore = 82;
    }
    return {
        categories: unique(categories),
        industries: ["generalPublic", "financeInvestment", "operationsGrowth", "contentCreator"],
        regions: ["全球"],
        locations,
        impactScore,
        severityScore,
        trendScore: 54,
        oneLine: "这是一条国际局势候选，需要优先说明最新变化、影响范围，以及它是否可能影响中国或用户判断。",
        body: {
            background: "新华网国际用于补充中文主流媒体对国际局势、外交、战争冲突、能源和重大公共事件的报道。",
            keyProgress: compact(item.title),
            whyItMatters: "国际事件只有在影响范围较大、与中国相关或可能改变政策、能源、贸易和安全判断时才应进入日报。",
            userRelevance: locations.length
                ? `当前事件涉及：${locations.join("、")}。系统还需判断其与中国及用户关注方向的关联。`
                : "这是一条全球性信息，是否展示主要取决于影响范围和严重程度。",
            whatToWatch: "后续关注官方表态、局势是否升级、多方确认和对中国外交、贸易或出行的影响。"
        }
    };
};
const internationalRssProfile = (item) => {
    const text = textOf(item);
    const locations = extractLocations(item);
    const businessSource = item.sourceId === "bbc-business-rss" || item.sourceId === "cnbc-world-rss";
    const officialMultilateral = item.sourceId === "un-news-rss";
    const majorConflict = hasAny(text, [
        "war",
        "conflict",
        "invasion",
        "ceasefire",
        "airstrike",
        "missile",
        "nuclear",
        "strait of hormuz",
        "regime",
        "president resigns",
        "coup",
        "战争",
        "冲突",
        "停火",
        "空袭",
        "导弹",
        "核设施",
        "霍尔木兹",
        "政权更迭",
        "总统辞职",
        "政变"
    ]);
    const chinaImpact = hasAny(text, [
        "china",
        "chinese",
        "tariff",
        "sanction",
        "export control",
        "shipping",
        "oil price",
        "energy",
        "customs",
        "trade",
        "中国",
        "关税",
        "制裁",
        "出口管制",
        "航运",
        "油价",
        "能源",
        "海关",
        "贸易"
    ]);
    const disaster = hasAny(text, [
        "earthquake",
        "typhoon",
        "cyclone",
        "flood",
        "wildfire",
        "tsunami",
        "humanitarian crisis",
        "地震",
        "台风",
        "气旋",
        "洪水",
        "山火",
        "海啸",
        "人道危机"
    ]);
    const categories = ["world"];
    if (majorConflict || chinaImpact || businessSource) {
        categories.push("policy");
    }
    if (businessSource || chinaImpact) {
        categories.push("finance", "operations");
    }
    if (disaster) {
        categories.push("disaster", "publicSafety");
    }
    const industries = ["generalPublic"];
    if (businessSource || chinaImpact) {
        industries.push("financeInvestment", "operationsGrowth", "ecommerceRetail");
    }
    if (disaster) {
        industries.push("localLife");
    }
    return {
        categories: unique(categories),
        industries: unique(industries),
        regions: ["全球"],
        locations,
        impactScore: majorConflict ? 92 : chinaImpact ? 86 : disaster ? 84 : officialMultilateral ? 78 : 72,
        severityScore: majorConflict ? 82 : disaster ? 80 : chinaImpact ? 58 : 45,
        trendScore: businessSource || chinaImpact ? 72 : 54,
        oneLine: "国际最新进展：这条英文来源需要完整整理为中文，并优先说明发生了什么变化、与中国的关系及后续风险。",
        body: {
            background: officialMultilateral
                ? "联合国官方信息用于确认战争、人道危机、国际决议和跨国公共风险。"
                : "国际主流媒体 RSS 用于补充全球突发、政策、贸易、能源和科技事件，不能单独替代事实确认。",
            keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
            whyItMatters: "重大国际变化可能通过外交、贸易、关税、能源、航运、安全或市场预期影响中国用户。",
            userRelevance: chinaImpact
                ? "这条信息已经命中中国、贸易、关税、能源或航运关联，需要进入中国用户的重点复核。"
                : "是否推送取决于事件影响范围、严重程度，以及它是否会影响中国或形成全球共同认知。",
            whatToWatch: "继续核对官方表态和第二个可靠来源，并关注局势变化、政策生效时间及对中国的传导路径。"
        }
    };
};
const technologyRssProfile = (item) => {
    const official = item.sourceId === "openai-news" || item.sourceId === "deepmind-blog";
    return {
        categories: ["ai", "technology", "product"],
        industries: ["aiProduct", "aiTechnology", "productManagement", "technologyEngineering", "educationResearch"],
        regions: ["全球"],
        locations: extractLocations(item),
        impactScore: official ? 80 : 72,
        severityScore: 20,
        trendScore: official ? 90 : 80,
        oneLine: "AI 与科技最新动态：重点区分正式产品发布、模型能力变化、研究进展和普通行业讨论。",
        body: {
            background: official
                ? "这是 AI 机构官方发布渠道，可用于确认产品、模型、研究和政策信息。"
                : "国际科技主流媒体用于发现 AI、芯片、平台和科技产品变化。",
            keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
            whyItMatters: "正式产品和技术变化可能影响 AI 产品设计、技术选型、行业竞争和职业判断。",
            userRelevance: "对 AI 产品经理、产品经理、技术研发、科研和关注 AI 行业的用户更相关。",
            whatToWatch: "后续核对官方文档、能力边界、发布时间、开放范围和真实用户影响。"
        }
    };
};
const chinaImpactOfficialProfile = (item) => {
    const tradeRelated = item.sourceId === "mofcom-trade";
    return {
        categories: tradeRelated
            ? ["world", "china", "policy", "finance", "operations", "ecommerce"]
            : ["world", "china", "policy"],
        industries: tradeRelated
            ? ["generalPublic", "financeInvestment", "operationsGrowth", "ecommerceRetail", "consumerBrand"]
            : ["generalPublic", "financeInvestment", "operationsGrowth"],
        regions: ["中国", "全球"],
        locations: extractLocations(item),
        impactScore: tradeRelated ? 84 : 82,
        severityScore: 48,
        trendScore: 72,
        oneLine: tradeRelated
            ? "中国关联确认：商务部发布了对外贸易或经贸政策信息，重点看适用范围、生效时间和行业影响。"
            : "中国关联确认：外交部发布了中国立场或领事信息，重点看它如何改变中国用户对国际事件的判断。",
        body: {
            background: tradeRelated
                ? "商务部官方发布用于确认关税、外贸、出口管制、跨境电商和对外经贸政策。"
                : "外交部官方发布用于确认重大国际事件中的中国立场、外交政策和领事提醒。",
            keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
            whyItMatters: "这是判断国际事件是否会直接影响中国、贸易、行业经营或出行安全的重要确认来源。",
            userRelevance: "作为中国用户，可据此判断事件与国内政策、贸易成本、企业经营或个人出行是否存在直接关联。",
            whatToWatch: "继续关注后续正式文件、执行时间、适用对象和相关部门配套说明。"
        }
    };
};
const xinhuaTechProfile = (item) => {
    const text = textOf(item);
    const sourceText = item.title;
    const aiRelated = /\bAI\b/i.test(sourceText) || hasAny(sourceText.toLowerCase(), [
        "人工智能",
        "大模型",
        "机器人",
        "芯片",
        "6g",
        "量子",
        "脑机",
        "自动驾驶"
    ]);
    const categories = ["technology"];
    const industries = ["technologyEngineering", "educationResearch"];
    if (aiRelated) {
        categories.push("ai", "product");
        industries.push("aiProduct", "aiTechnology", "productManagement", "operationsGrowth");
    }
    return {
        categories,
        industries: unique(industries),
        regions: ["中国", "全球"],
        locations: extractLocations(item),
        impactScore: /突破|首次|发布|商业化|量产|全球/.test(item.title) ? 78 : 70,
        severityScore: 18,
        trendScore: aiRelated ? 88 : 74,
        oneLine: aiRelated
            ? "这是一条 AI 或科技产业候选，需要区分真实技术进展、产品落地和普通宣传信息。"
            : "这是一条工程或科技产业候选，重点看可验证的技术指标、制造进展和实际应用。",
        body: {
            background: "新华网科技用于补充科研突破、工程制造和科技产业的中文主流媒体信息。",
            keyProgress: compact(item.title),
            whyItMatters: "技术突破、产品量产和产业应用会影响工程研发、产业规划和职业方向判断。",
            userRelevance: aiRelated
                ? "对 AI 产品、产品经理、技术研发、教育研究和运营用户更相关。"
                : "对技术研发、工程师、教育研究和关注产业升级的用户更相关。",
            whatToWatch: "后续重点看是否有可验证指标、真实产品、量产计划、用户场景或权威机构进一步确认。"
        }
    };
};
const reliefWebProfile = (item) => ({
    categories: ["disaster", "publicSafety", "world"],
    industries: ["generalPublic", "localLife", "operationsGrowth"],
    regions: ["全球"],
    locations: extractLocations(item),
    impactScore: 70,
    severityScore: 68,
    trendScore: 25,
    oneLine: "这是一条人道危机 / 灾害报告候选，适合用于公共风险和国际局势背景判断。",
    body: {
        background: "ReliefWeb 更适合补充灾害、人道危机和公共风险的背景报告。",
        keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
        whyItMatters: "它能帮助用户了解全球风险变化，但进入日报前仍需判断是否与用户国家、城市或公共安全有关。",
        userRelevance: "对所有用户都有低频公共风险价值，对相关地区用户权重更高。",
        whatToWatch: "后续需要确认来源 appname 和接口权限，再作为稳定来源使用。"
    }
});
const profileForRawItem = (item) => {
    if (item.sourceId.startsWith("city-news-rss:")) {
        const text = textOf(item);
        const isPublicRisk = hasAny(text, [
            "灾害",
            "台风",
            "暴雨",
            "洪水",
            "地震",
            "山火",
            "预警",
            "应急响应",
            "事故",
            "停水",
            "停电",
            "道路封闭"
        ]);
        const categories = ["local", "policy", "china"];
        if (isPublicRisk) {
            categories.push("publicSafety", "disaster");
        }
        return {
            categories,
            industries: ["localLife", "generalPublic", "operationsGrowth"],
            regions: ["中国"],
            locations: item.localCity ? [item.localCity] : [],
            impactScore: isPublicRisk ? 76 : 64,
            severityScore: isPublicRisk ? 68 : 24,
            trendScore: 42,
            oneLine: "本地变化：这条信息来自用户所在城市或家乡城市的新闻发现源，重点看是否存在政策、公共服务、交通或风险变化。",
            body: {
                background: `${item.localCity ?? "相关城市"}的本地新闻发现源汇总了近期公开报道，当前先用于发现可能影响居民和工作安排的变化。`,
                keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
                whyItMatters: "城市政策、交通和公共安全变化可能直接影响出行、居住与工作安排；发现源只负责找到线索，正式判断还要看当地政府或主流媒体的原文。",
                userRelevance: `如果你居住在${item.localCity ?? "该城市"}，或近期需要前往这里，可以优先确认这条消息是否涉及你的出行、居住、工作或家人安排。`,
                whatToWatch: "后续重点确认当地政府、应急部门或主流媒体是否发布同一事件的正式信息。"
            }
        };
    }
    if (item.sourceId === "arxiv-cs-api") {
        return arxivProfile(item);
    }
    if (item.sourceId === "cas-science-news") {
        const communicationRelated = hasAny(textOf(item), [
            "通信",
            "无线",
            "网络",
            "信号",
            "频谱",
            "信道",
            "mimo",
            "6g"
        ]);
        return {
            categories: ["technology", "education"],
            industries: communicationRelated
                ? ["technologyEngineering", "educationResearch", "communicationsResearch"]
                : ["technologyEngineering", "educationResearch"],
            regions: ["中国"],
            locations: extractLocations(item),
            impactScore: 68,
            severityScore: 16,
            trendScore: 72,
            oneLine: "科研动态：这项研究公布了新的实验结果或方法，重点看它解决了什么问题，以及离实际应用还有多远。",
            body: {
                background: "中国科学院科研动态提供研究机构发布的科研成果和进展，适合作为论文与技术方向的事实线索。",
                keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
                whyItMatters: "科研进展可以帮助你判断某个技术方向是否持续出现新成果，以及它是否可能影响后续研究、工程应用或行业产品。",
                userRelevance: "对博士生、通信研究、工程师和关注技术趋势的人更有参考价值；普通读者可把它作为低频科技背景了解。",
                whatToWatch: "后续关注论文原文、实验指标、是否有开源材料，以及研究成果能否进入真实场景。"
            }
        };
    }
    if (item.sourceId === "mohurd-construction") {
        return {
            categories: ["policy", "china", "technology"],
            industries: ["architectureBuiltEnvironment", "technologyEngineering", "generalPublic"],
            regions: ["中国"],
            locations: extractLocations(item),
            impactScore: 70,
            severityScore: 18,
            trendScore: 66,
            oneLine: "建筑与城市：住房、建设或城市更新领域出现新的政策或项目动态，重点看适用地区和执行时间。",
            body: {
                background: "住房和城乡建设部是建筑、住房、城市更新和城乡建设政策的重要官方来源。",
                keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
                whyItMatters: "这类变化可能影响建筑项目、城市公共空间、住房安排和工程建设判断，也会为建筑专业人士提供行业背景。",
                userRelevance: "对建筑相关专业、工程师、城市规划和关注居住地发展的人更直接；其他用户可关注它对城市公共服务和居住环境的影响。",
                whatToWatch: "后续重点看涉及的城市、项目范围、资金安排、技术标准和地方落地文件。"
            }
        };
    }
    if (item.sourceId === "gdacs-feed") {
        return gdacsProfile(item);
    }
    if (item.sourceId === "gov-cn-policy-library") {
        return govPolicyProfile(item);
    }
    if (item.sourceId === "mem-cn") {
        return memProfile(item);
    }
    if (item.sourceId === "cac-cn") {
        return cacProfile(item);
    }
    if (item.sourceId === "xinhua-world") {
        return xinhuaWorldProfile(item);
    }
    if ([
        "bbc-world-rss",
        "bbc-business-rss",
        "npr-world-rss",
        "sky-world-rss",
        "france24-middle-east-rss",
        "france24-asia-pacific-rss",
        "wsj-world-rss",
        "cnbc-world-rss",
        "un-news-rss"
    ].includes(item.sourceId)) {
        return internationalRssProfile(item);
    }
    if (["bbc-technology-rss", "openai-news", "deepmind-blog", "huggingface-blog", "techcrunch-ai-rss", "theverge-ai-rss"].includes(item.sourceId)) {
        return technologyRssProfile(item);
    }
    if (item.sourceId === "mfa-cn-news" || item.sourceId === "mofcom-trade") {
        return chinaImpactOfficialProfile(item);
    }
    if (item.sourceId === "xinhua-tech") {
        return xinhuaTechProfile(item);
    }
    if (item.sourceId === "moe-cn") {
        return moeProfile(item);
    }
    if (item.sourceId === "chrm-mohrss" || item.sourceId === "mohrss-cn") {
        return chrmProfile(item);
    }
    if (item.sourceId === "stats-cn-data" || item.sourceId === "stats-cn-rss") {
        return statsDataProfile(item);
    }
    if (item.sourceId === "mofcom-consumption" || item.sourceId === "mofcom-cn") {
        return mofcomConsumptionProfile(item);
    }
    if (item.sourceId === "gdelt-doc-api") {
        return gdeltProfile(item);
    }
    if (item.sourceId === "reliefweb-api") {
        return reliefWebProfile(item);
    }
    return {
        categories: ["world"],
        industries: ["generalPublic"],
        regions: ["全球"],
        locations: extractLocations(item),
        impactScore: 50,
        severityScore: 35,
        trendScore: 35,
        oneLine: "这是一条尚未细分来源规则的候选信息，需要继续补充分类和评分规则。",
        body: {
            background: "该来源已经进入统一原始数据结构，但还没有专门的转换规则。",
            keyProgress: compact(item.summaryFromSource || item.rawText || item.title),
            whyItMatters: "统一结构先保证管道能跑通，后续再逐步提高分类和摘要质量。",
            whatToWatch: "为该来源补充专门适配器和评分规则。"
        }
    };
};
function rawItemToCandidate(item) {
    const profile = profileForRawItem(item);
    const images = (item.imageUrls ?? []).map((url) => ({
        url,
        sourceUrl: item.url
    }));
    return {
        id: `real-${item.id}`,
        title: item.title,
        oneLine: profile.oneLine,
        categories: profile.categories,
        industries: profile.industries,
        regions: profile.regions,
        locations: profile.locations,
        sourceIds: [item.sourceId],
        publishedAt: item.publishedAt ?? item.updatedAt ?? "",
        sourceLinks: [
            {
                title: item.localCity ? `${item.localCity}本地公开信息` : sourceName(item.sourceId),
                url: item.url,
                sourceId: item.sourceId,
                publishedAt: item.publishedAt,
                language: item.language,
                originalLanguage: item.originalLanguage ?? item.language,
                translationStatus: item.translationStatus
            }
        ],
        images,
        body: profile.body,
        impactScore: profile.impactScore,
        severityScore: profile.severityScore,
        freshnessScore: freshnessScore(item.publishedAt, item.fetchedAt),
        trendScore: profile.trendScore,
        isExample: false
    };
}
function rawItemsToCandidates(items) {
    return items
        .filter((item) => sourceRegistry_1.sourceRegistry.find((source) => source.id === item.sourceId)?.standaloneCandidate !== false)
        .map(rawItemToCandidate);
}
