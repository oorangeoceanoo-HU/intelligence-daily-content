"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveIndustryTags = deriveIndustryTags;
exports.deriveContentCategories = deriveContentCategories;
exports.createProfileKey = createProfileKey;
const phaseIndustryMap = {
    "产品实习 / AI 学习者": ["aiProduct", "productManagement", "aiTechnology"],
    产品经理: ["productManagement", "aiProduct", "operationsGrowth"],
    "设计师 / 体验研究": ["designUx", "productManagement"],
    "工程师 / 技术研发": ["technologyEngineering", "aiTechnology"],
    创业者: ["startupBusiness", "financeInvestment", "operationsGrowth"],
    自媒体创作者: ["contentCreator"],
    "管理者 / 业务负责人": ["startupBusiness", "financeInvestment", "operationsGrowth"],
    自由职业者: ["contentCreator", "startupBusiness"],
    "学生 / 正在探索方向": ["generalPublic", "educationResearch"],
    "博士 / 学术研究": ["educationResearch", "communicationsResearch"],
    "求职中 / 转行中": ["generalPublic", "hrRecruiting"],
    初级职场人: ["generalPublic"]
};
const careerIndustryMap = {
    "AI 与产品方向": ["aiProduct", "productManagement", "aiTechnology"],
    "互联网产品 / 产品经理": ["productManagement", "aiProduct", "operationsGrowth"],
    "技术研发 / 工程": ["technologyEngineering", "aiTechnology"],
    "设计 / 用户体验": ["designUx", "productManagement"],
    "教师 / 教育从业者": ["teacher", "educationResearch"],
    "人力资源 / 招聘": ["hrRecruiting"],
    "运营 / 增长": ["operationsGrowth", "contentCreator"],
    "内容创作 / 自媒体": ["contentCreator"],
    "创业 / 商业模式": ["startupBusiness", "financeInvestment"],
    "金融 / 投资": ["financeInvestment"],
    "教育 / 研究": ["educationResearch", "teacher"],
    "博士 / 学术研究": ["educationResearch", "communicationsResearch"],
    "通信 / 网络研究": ["communicationsResearch", "technologyEngineering"],
    "建筑 / 城乡建设": ["architectureBuiltEnvironment", "technologyEngineering"],
    医疗健康: ["healthcare"],
    "电商 / 消费品牌": ["ecommerceRetail", "consumerBrand", "operationsGrowth"],
    "游戏 / 文娱": ["gamesEntertainment", "contentCreator"],
    暂时不确定: ["generalPublic"]
};
const interestIndustryMap = {
    "AI 产品": ["aiProduct", "productManagement"],
    产品行业: ["productManagement"],
    "AI 技术": ["aiTechnology", "technologyEngineering"],
    热点素材: ["contentCreator", "generalPublic"],
    教育行业: ["teacher", "educationResearch"],
    "HR / 招聘": ["hrRecruiting"],
    运营增长: ["operationsGrowth"],
    创业融资: ["startupBusiness", "financeInvestment"],
    消费趋势: ["consumerBrand", "ecommerceRetail"],
    金融: ["financeInvestment"],
    教育: ["educationResearch", "teacher"],
    论文与通信研究: ["educationResearch", "communicationsResearch"],
    建筑与城市: ["architectureBuiltEnvironment", "technologyEngineering"],
    医疗健康: ["healthcare"],
    游戏文娱: ["gamesEntertainment", "contentCreator"],
    电商: ["ecommerceRetail", "consumerBrand"],
    本地提醒: ["localLife", "generalPublic"]
};
const interestCategoryMap = {
    "AI 产品": ["ai", "product", "technology"],
    产品行业: ["product", "technology"],
    "AI 技术": ["ai", "technology"],
    热点素材: ["lightTrend", "creator"],
    教育行业: ["education", "policy"],
    "HR / 招聘": ["hr", "policy"],
    运营增长: ["operations", "consumer", "ecommerce"],
    创业融资: ["startup", "finance"],
    消费趋势: ["consumer", "ecommerce"],
    金融: ["finance", "policy"],
    教育: ["education", "policy"],
    论文与通信研究: ["education", "technology"],
    建筑与城市: ["technology", "policy"],
    医疗健康: ["healthcare", "publicSafety", "policy"],
    游戏文娱: ["lightTrend", "creator"],
    电商: ["ecommerce", "consumer"],
    本地提醒: ["local", "disaster", "publicSafety"]
};
const careerCategoryMap = {
    "AI 与产品方向": ["ai", "product", "technology"],
    "互联网产品 / 产品经理": ["product", "technology", "operations"],
    "技术研发 / 工程": ["technology", "ai"],
    "设计 / 用户体验": ["design", "product"],
    "教师 / 教育从业者": ["education", "policy"],
    "人力资源 / 招聘": ["hr", "policy"],
    "运营 / 增长": ["operations", "consumer", "ecommerce"],
    "内容创作 / 自媒体": ["creator", "lightTrend"],
    "创业 / 商业模式": ["startup", "finance"],
    "金融 / 投资": ["finance", "policy"],
    "教育 / 研究": ["education", "technology"],
    "博士 / 学术研究": ["education", "technology"],
    "通信 / 网络研究": ["technology"],
    "建筑 / 城乡建设": ["technology", "policy"],
    医疗健康: ["healthcare", "policy", "publicSafety"],
    "电商 / 消费品牌": ["ecommerce", "consumer", "operations"],
    "游戏 / 文娱": ["creator", "lightTrend"],
    暂时不确定: ["world", "china", "policy"]
};
const alwaysOnCategories = [
    "world",
    "china",
    "local",
    "policy",
    "disaster",
    "publicSafety"
];
const alwaysOnIndustries = ["generalPublic", "localLife"];
const unique = (items) => Array.from(new Set(items));
const fromLookup = (values, lookup) => values.flatMap((value) => lookup[value] ?? []);
function deriveIndustryTags(profile) {
    return unique([
        ...alwaysOnIndustries,
        ...(phaseIndustryMap[profile.phase] ?? []),
        ...fromLookup(profile.careerDirections, careerIndustryMap),
        ...fromLookup(profile.interests, interestIndustryMap)
    ]);
}
function deriveContentCategories(profile) {
    return unique([
        ...alwaysOnCategories,
        ...fromLookup(profile.careerDirections, careerCategoryMap),
        ...fromLookup(profile.interests, interestCategoryMap)
    ]);
}
function createProfileKey(profile) {
    return [
        profile.country,
        profile.livingCity,
        profile.hometownCity,
        ...profile.careerDirections,
        ...profile.interests
    ].join("|");
}
