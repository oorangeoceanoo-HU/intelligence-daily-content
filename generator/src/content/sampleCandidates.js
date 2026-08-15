"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleCandidateItems = void 0;
exports.sampleCandidateItems = [
    {
        id: "candidate-global-policy-energy",
        title: "国际局势变化继续影响能源与贸易预期",
        oneLine: "这类全球性事件会通过能源价格、航运成本和外贸预期间接影响国内产业与居民生活。",
        categories: ["world", "policy"],
        industries: ["generalPublic", "financeInvestment", "operationsGrowth"],
        regions: ["全球", "中国"],
        locations: [],
        sourceIds: ["gdelt-doc-api"],
        publishedAt: "2026-08-06T08:00:00+08:00",
        sourceLinks: [
            {
                title: "全球新闻聚合线索",
                url: "https://api.gdeltproject.org/api/v2/doc/doc",
                sourceId: "gdelt-doc-api",
                publishedAt: "2026-08-06T08:00:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "国际局势类信息通常不会只停留在新闻本身，它会影响能源、供应链、汇率和市场预期。",
            keyProgress: "候选信息显示相关事件仍在发酵，需要继续观察是否出现政策、交通或贸易层面的连锁反应。",
            whyItMatters: "即使用户不从事国际业务，这类事件也可能影响物价、就业预期和行业判断。",
            userRelevance: "对所有用户保留为必须知道类信息。",
            whatToWatch: "后续重点观察中国相关表态、能源价格和跨境贸易政策变化。"
        },
        impactScore: 92,
        severityScore: 82,
        freshnessScore: 84,
        trendScore: 76,
        isExample: true
    },
    {
        id: "candidate-local-rain-alert",
        title: "华东部分城市强降雨与通勤风险提醒",
        oneLine: "如果用户居住或家乡在上海、杭州等城市，这类预警应进入当日风险提醒。",
        categories: ["local", "disaster", "publicSafety"],
        industries: ["generalPublic", "localLife"],
        regions: ["中国"],
        locations: ["上海", "杭州", "苏州", "南京"],
        sourceIds: ["gdacs-feed", "reliefweb-api"],
        publishedAt: "2026-08-06T07:20:00+08:00",
        sourceLinks: [
            {
                title: "灾害与公共风险候选源",
                url: "https://www.gdacs.org/xml/rss.xml",
                sourceId: "gdacs-feed",
                publishedAt: "2026-08-06T07:20:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "本地天气和灾害信息不需要每天大篇幅展示，但一旦影响通勤和出行，就应优先提醒。",
            keyProgress: "候选信息命中了用户城市范围，适合放在风险提醒或城市相关板块。",
            whyItMatters: "这类信息主要服务于避免风险，而不是扩展知识。",
            userRelevance: "对上海、杭州等城市用户相关性较高。",
            whatToWatch: "后续可接入气象预警和本地应急管理来源提高准确度。"
        },
        impactScore: 78,
        severityScore: 86,
        freshnessScore: 95,
        trendScore: 42,
        isExample: true
    },
    {
        id: "candidate-ai-model-release",
        title: "主流 AI 公司发布多模态模型能力更新",
        oneLine: "这类更新可能改变 AI 产品的功能边界，也会影响产品经理和技术团队的选型判断。",
        categories: ["ai", "product", "technology"],
        industries: ["aiProduct", "aiTechnology", "productManagement", "technologyEngineering"],
        regions: ["全球"],
        locations: [],
        sourceIds: ["openai-news", "deepmind-blog", "huggingface-blog"],
        publishedAt: "2026-08-06T10:30:00+08:00",
        sourceLinks: [
            {
                title: "AI 公司官方发布页",
                url: "https://openai.com/news/",
                sourceId: "openai-news",
                publishedAt: "2026-08-06T10:30:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "AI 模型能力更新会影响产品交互、内容生产、开发工具和企业采购。",
            keyProgress: "候选信息显示多模态、视频、语音和智能体能力仍是产品迭代重点。",
            whyItMatters: "对 AI 产品、产品经理、技术研发和教育研究用户都有直接参考价值。",
            userRelevance: "对选择 AI 与产品、AI 技术、产品行业的用户权重较高。",
            whatToWatch: "后续观察是否出现可实际落地的产品功能、价格变化和开放接口。"
        },
        impactScore: 83,
        severityScore: 45,
        freshnessScore: 90,
        trendScore: 94,
        isExample: true
    },
    {
        id: "candidate-education-ai-guideline",
        title: "教育领域数字化与 AI 应用规范进入新阶段",
        oneLine: "教育从业者需要关注 AI 工具进入课堂后的合规、教学边界和评价方式变化。",
        categories: ["education", "policy", "ai"],
        industries: ["teacher", "educationResearch", "aiTechnology"],
        regions: ["中国"],
        locations: [],
        sourceIds: ["moe-cn", "gov-cn-policy-library"],
        publishedAt: "2026-08-06T09:15:00+08:00",
        sourceLinks: [
            {
                title: "教育政策候选源",
                url: "https://www.moe.gov.cn/",
                sourceId: "moe-cn",
                publishedAt: "2026-08-06T09:15:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "AI 工具进入教育场景后，学校、教师和培训机构都会受到政策和教学规范影响。",
            keyProgress: "候选信息指向数字化教学、AI 辅助学习和教育公平相关方向。",
            whyItMatters: "对老师、教育从业者和教育研究用户具有更高相关性。",
            userRelevance: "如果用户选择教师、教育行业或教育研究，应进入行业重点。",
            whatToWatch: "后续关注地方教育部门是否出台更具体执行方案。"
        },
        impactScore: 76,
        severityScore: 48,
        freshnessScore: 82,
        trendScore: 78,
        isExample: true
    },
    {
        id: "candidate-hr-employment-policy",
        title: "就业服务和招聘合规相关政策更新",
        oneLine: "HR 和招聘岗位需要关注就业服务、劳动关系、平台招聘和社保相关政策变化。",
        categories: ["hr", "policy", "china"],
        industries: ["hrRecruiting", "generalPublic"],
        regions: ["中国"],
        locations: [],
        sourceIds: ["mohrss-cn", "gov-cn-policy-library"],
        publishedAt: "2026-08-06T11:00:00+08:00",
        sourceLinks: [
            {
                title: "人社政策候选源",
                url: "https://www.mohrss.gov.cn/",
                sourceId: "mohrss-cn",
                publishedAt: "2026-08-06T11:00:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "就业和劳动政策会影响企业招聘、用工成本、社保流程和候选人沟通。",
            keyProgress: "候选信息命中 HR、招聘和就业服务方向，适合进入 HR 用户的行业重点。",
            whyItMatters: "对 HR 来说，这类信息比普通 AI 产品动态更直接。",
            userRelevance: "选择人力资源、招聘、求职转行等画像时提高权重。",
            whatToWatch: "后续关注是否有地方执行细则和企业端操作变化。"
        },
        impactScore: 72,
        severityScore: 52,
        freshnessScore: 80,
        trendScore: 65,
        isExample: true
    },
    {
        id: "candidate-operations-consumer-shift",
        title: "消费与电商平台运营规则出现调整信号",
        oneLine: "运营和电商用户需要关注平台规则、内容转化、消费趋势和品牌投放方式的变化。",
        categories: ["operations", "ecommerce", "consumer"],
        industries: ["operationsGrowth", "ecommerceRetail", "consumerBrand", "contentCreator"],
        regions: ["中国"],
        locations: [],
        sourceIds: ["mofcom-cn", "stats-cn-rss"],
        publishedAt: "2026-08-06T13:30:00+08:00",
        sourceLinks: [
            {
                title: "商务消费候选源",
                url: "https://www.mofcom.gov.cn/",
                sourceId: "mofcom-cn",
                publishedAt: "2026-08-06T13:30:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "运营岗位需要把政策、平台变化和消费数据结合起来看，判断内容和渠道策略。",
            keyProgress: "候选信息涉及消费趋势、电商平台和增长策略，适合运营用户关注。",
            whyItMatters: "这类信息可以帮助运营判断选题、活动节奏和投放重点。",
            userRelevance: "选择运营增长、电商、消费趋势、内容创作时提高权重。",
            whatToWatch: "后续观察平台具体规则和消费数据是否形成一致趋势。"
        },
        impactScore: 68,
        severityScore: 38,
        freshnessScore: 78,
        trendScore: 84,
        isExample: true
    },
    {
        id: "candidate-health-public-reminder",
        title: "公共卫生与健康提示需要低频关注",
        oneLine: "健康类信息不一定每天推送，但当它影响公众出行、就医或生活方式时应进入日报。",
        categories: ["healthcare", "publicSafety", "china"],
        industries: ["healthcare", "generalPublic", "localLife"],
        regions: ["中国"],
        locations: [],
        sourceIds: ["nhc-cn"],
        publishedAt: "2026-08-06T12:10:00+08:00",
        sourceLinks: [
            {
                title: "健康政策候选源",
                url: "https://www.nhc.gov.cn/",
                sourceId: "nhc-cn",
                publishedAt: "2026-08-06T12:10:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "健康和公共卫生信息需要谨慎筛选，避免制造焦虑。",
            keyProgress: "候选信息适合在影响范围较大时进入公共安全或健康板块。",
            whyItMatters: "医疗健康从业者和普通用户的关注角度不同，但都需要可靠官方来源。",
            userRelevance: "选择医疗健康或本地提醒时提高权重。",
            whatToWatch: "后续重点关注官方说明和本地执行要求。"
        },
        impactScore: 70,
        severityScore: 70,
        freshnessScore: 72,
        trendScore: 50,
        isExample: true
    },
    {
        id: "candidate-light-content-template",
        title: "内容平台出现新的轻量传播模板",
        oneLine: "这类信息适合内容创作者和运营低权重查看，不应挤占重大新闻和行业政策的位置。",
        categories: ["lightTrend", "creator", "consumer"],
        industries: ["contentCreator", "operationsGrowth", "consumerBrand"],
        regions: ["中国"],
        locations: [],
        sourceIds: ["gdelt-doc-api"],
        publishedAt: "2026-08-06T16:00:00+08:00",
        sourceLinks: [
            {
                title: "热点趋势候选线索",
                url: "https://api.gdeltproject.org/api/v2/doc/doc",
                sourceId: "gdelt-doc-api",
                publishedAt: "2026-08-06T16:00:00+08:00"
            }
        ],
        images: [],
        body: {
            background: "热点素材可以帮助内容创作，但它不是这个 App 的主核心。",
            keyProgress: "候选信息显示某类内容模板正在传播，但仍需要确认热度是否足够大。",
            whyItMatters: "对内容创作者、运营和消费品牌用户有轻量参考价值。",
            userRelevance: "只有用户选择热点素材、运营增长或内容创作时才提高权重。",
            whatToWatch: "后续需要接社交平台热度或人工判断，避免误收小圈层热点。"
        },
        impactScore: 42,
        severityScore: 20,
        freshnessScore: 88,
        trendScore: 78,
        isExample: true
    }
];
