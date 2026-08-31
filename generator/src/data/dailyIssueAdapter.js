"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatIssueDateLabel = exports.buildBriefingViewData = exports.limitIssueToPublicPage = exports.adaptDailyIssueCard = void 0;
const sectionLabels = {
    front: "今日要闻",
    world: "国际局势",
    china: "国内动态",
    local: "城市与本地",
    industry: "行业动向",
    ai: "AI 动向",
    product: "产品观察",
    risk: "风险提醒",
    friends: "好友分享",
    light: "轻量关注"
};
const industryLabels = {
    aiProduct: "AI 产品",
    productManagement: "产品",
    aiTechnology: "AI 技术",
    technologyEngineering: "科技",
    educationResearch: "教育研究",
    communicationsResearch: "通信研究",
    architectureBuiltEnvironment: "建筑与城市",
    teacher: "教师",
    hrRecruiting: "人力资源",
    operationsGrowth: "运营增长",
    contentCreator: "内容创作",
    financeInvestment: "金融投资",
    healthcare: "医疗健康",
    ecommerceRetail: "电商零售",
    consumerBrand: "消费品牌",
    designUx: "设计体验",
    startupBusiness: "创业商业",
    gamesEntertainment: "游戏娱乐",
    localLife: "本地生活",
    generalPublic: "大众相关"
};
const formatPublishedAt = (value) => {
    if (!value) {
        return undefined;
    }
    const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : value;
};
const getScope = (card) => {
    const labels = [
        sectionLabels[card.section],
        ...card.industries.map((industry) => industryLabels[industry]).filter((label) => Boolean(label))
    ];
    return [...new Set(labels)].slice(0, 3).join(" / ");
};
const adaptDailyIssueCard = (card) => {
    const primarySource = card.sourceLinks[0];
    const primaryImage = card.images[0];
    return {
        id: card.id,
        title: card.title,
        level: card.importance,
        scope: getScope(card),
        sourceTrust: card.credibility,
        summary: card.oneLine,
        background: card.body.background,
        keyProgress: card.body.keyProgress,
        whyItMatters: card.body.whyItMatters,
        relation: card.body.userRelevance,
        whatToWatch: card.body.whatToWatch,
        sourceName: primarySource?.title,
        sourceUrl: primarySource?.url,
        publishedAt: formatPublishedAt(primarySource?.publishedAt),
        imageUrl: primaryImage?.url,
        imageCaption: primaryImage?.caption,
        images: card.images,
        hasImage: card.images.length > 0
    };
};
exports.adaptDailyIssueCard = adaptDailyIssueCard;
const limitIssueToPublicPage = (issue) => {
    const cards = issue.cards.slice(0, 8);
    const cardIds = new Set(cards.map((card) => card.id));
    return {
        ...issue,
        cards,
        pageCount: cards.length ? 1 : 0,
        topCardId: cards.find((card) => card.id === issue.topCardId)?.id ?? cards[0]?.id,
        editionCardIds: issue.editionCardIds?.filter((id) => cardIds.has(id)),
        carriedCardIds: issue.carriedCardIds?.filter((id) => cardIds.has(id))
    };
};
exports.limitIssueToPublicPage = limitIssueToPublicPage;
const splitIntoPages = (items, pageCount) => {
    const safePageCount = Math.max(1, Math.min(pageCount || 1, items.length));
    const baseSize = Math.floor(items.length / safePageCount);
    const remainder = items.length % safePageCount;
    const pages = [];
    let cursor = 0;
    for (let index = 0; index < safePageCount; index += 1) {
        const size = baseSize + (index < remainder ? 1 : 0);
        pages.push(items.slice(cursor, cursor + size));
        cursor += size;
    }
    return pages;
};
const buildBriefingViewData = (issue, fallbackPages) => {
    if (!issue?.cards.length) {
        return {
            pages: fallbackPages,
            issueDate: issue?.date ?? "2026-08-04",
            estimatedReadMinutes: 6,
            isFallback: true
        };
    }
    const adaptedCards = issue.cards.map(exports.adaptDailyIssueCard);
    const hasExplicitPersonalizedPages = issue.cards.some((card) => card.personalizationPage !== undefined);
    const explicitPages = hasExplicitPersonalizedPages
        ? [1, 2, 3]
            .map((pageNumber) => adaptedCards.filter((_, index) => issue.cards[index].personalizationPage === pageNumber))
            .filter((cards) => cards.length > 0)
        : [];
    const cardPages = explicitPages.length ? explicitPages : splitIntoPages(adaptedCards, issue.pageCount);
    const totalPages = cardPages.length;
    const pages = cardPages.map((cards, index) => {
        const firstDraft = issue.cards.find((card) => card.id === cards[0].id);
        return {
            id: `generated-${issue.date}-${index + 1}`,
            edition: `第 ${index + 1} 版 / ${totalPages}`,
            title: index === 0 ? "今日要闻" : sectionLabels[firstDraft?.section ?? "front"],
            subtitle: `筛选后 ${cards.length} 条`,
            leadCardId: index === 0 && issue.topCardId && cards.some((card) => card.id === issue.topCardId)
                ? issue.topCardId
                : cards[0].id,
            cards
        };
    });
    return {
        pages,
        issueDate: issue.date,
        estimatedReadMinutes: issue.estimatedReadMinutes,
        isFallback: false
    };
};
exports.buildBriefingViewData = buildBriefingViewData;
const formatIssueDateLabel = (date) => {
    const [year, month, day] = date.split("-").map(Number);
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const weekday = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
        ? weekdays[new Date(year, month - 1, day).getDay()]
        : "";
    return `${year} 年 ${month} 月 ${day} 日${weekday ? ` ${weekday}` : ""}`;
};
exports.formatIssueDateLabel = formatIssueDateLabel;
