"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDailyIssuePayload = void 0;
const dailyIssueBuilder_1 = require("../content/dailyIssueBuilder");
const webNoise_1 = require("../content/webNoise");
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const isPersonalizationPage = (value) => value === 1 || value === 2 || value === 3;
const isValidCard = (value) => {
    if (!isRecord(value) || !isRecord(value.body)) {
        return false;
    }
    return (typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.oneLine === "string" &&
        typeof value.importance === "string" &&
        typeof value.credibility === "string" &&
        typeof value.section === "string" &&
        isStringArray(value.tags) &&
        isStringArray(value.industries) &&
        typeof value.body.background === "string" &&
        typeof value.body.keyProgress === "string" &&
        typeof value.body.whyItMatters === "string" &&
        (value.personalizationPage === undefined || isPersonalizationPage(value.personalizationPage)) &&
        Array.isArray(value.sourceLinks) &&
        Array.isArray(value.images));
};
const isValidIssue = (value) => {
    if (!isRecord(value)) {
        return false;
    }
    return (typeof value.id === "string" &&
        /^\d{4}-\d{2}-\d{2}$/u.test(String(value.date)) &&
        typeof value.userId === "string" &&
        Array.isArray(value.cards) &&
        value.cards.length > 0 &&
        value.cards.every(isValidCard) &&
        typeof value.estimatedReadMinutes === "number" &&
        typeof value.pageCount === "number" &&
        typeof value.generatedAt === "string" &&
        isStringArray(value.pushSlots));
};
const repairIssueAfterFiltering = (issue, cards) => {
    const cardIds = new Set(cards.map((card) => card.id));
    const topCard = cards.find((card) => card.id === issue.topCardId) ?? cards[0];
    const keptEditionCardIds = issue.editionCardIds?.filter((id) => cardIds.has(id));
    const keptCarriedCardIds = issue.carriedCardIds?.filter((id) => cardIds.has(id));
    return {
        ...issue,
        cards,
        pageCount: (0, dailyIssueBuilder_1.calculateDailyIssuePageCount)(cards.length),
        topCardId: topCard?.id,
        editionCardIds: keptEditionCardIds,
        carriedCardIds: keptCarriedCardIds
    };
};
const parseDailyIssuePayload = (value) => {
    if (!isRecord(value) || !isValidIssue(value.issue)) {
        return undefined;
    }
    const cleanCards = value.issue.cards.filter((card) => !(0, webNoise_1.cardContainsWebNoise)(card));
    if (!cleanCards.length) {
        return undefined;
    }
    return { issue: repairIssueAfterFiltering(value.issue, cleanCards) };
};
exports.parseDailyIssuePayload = parseDailyIssuePayload;
