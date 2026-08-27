"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeEditionIssue = void 0;
const dailyIssueBuilder_1 = require("./dailyIssueBuilder");
const textSimilarity_1 = require("./textSimilarity");
const translation_1 = require("./translation");
const importanceWeight = {
    S: 400,
    A: 300,
    B: 200,
    C: 100
};
const sectionWeight = {
    front: 80,
    risk: 70,
    china: 65,
    world: 60,
    local: 55,
    ai: 50,
    product: 48,
    industry: 46,
    light: 20,
    friends: 0
};
const sourceUrls = (card) => new Set(card.sourceLinks.map((source) => source.url).filter(Boolean));
const eventText = (card) => [
    card.title,
    card.oneLine,
    card.body.background,
    card.body.keyProgress,
    ...card.sourceLinks.map((source) => source.title)
]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
const anchoredConflictEvents = [
    [/乌克兰|ukraine/u, /俄罗斯|russia/u, /空袭|空中袭击|air\s*(?:attack|raid|strike)/u],
    [/伊朗|iran/u, /美国|u\.?s\.?|american/u, /霍尔木兹|hormuz/u]
];
const matchesAllAnchors = (text, anchors) => anchors.every((anchor) => anchor.test(text));
const sameAnchoredEvent = (left, right) => {
    const leftText = eventText(left);
    const rightText = eventText(right);
    return anchoredConflictEvents.some((anchors) => matchesAllAnchors(leftText, anchors) && matchesAllAnchors(rightText, anchors));
};
const sameEvent = (left, right) => {
    const leftUrls = sourceUrls(left);
    if (right.sourceLinks.some((source) => leftUrls.has(source.url))) {
        return true;
    }
    if (sameAnchoredEvent(left, right)) {
        return true;
    }
    return (0, textSimilarity_1.textSimilarity)(left.title, right.title) >= 0.58;
};
const contentFingerprint = (card) => JSON.stringify({
    title: card.title,
    oneLine: card.oneLine,
    background: card.body.background,
    keyProgress: card.body.keyProgress,
    whyItMatters: card.body.whyItMatters,
    userRelevance: card.body.userRelevance,
    whatToWatch: card.body.whatToWatch,
    sources: card.sourceLinks.map((source) => source.url).sort()
});
const unchangedEvent = (left, right) => sameEvent(left, right) && contentFingerprint(left) === contentFingerprint(right);
const publishedTimestamp = (card) => {
    const value = card.sourceLinks[0]?.publishedAt;
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
};
const cardTextLength = (card) => [
    card.title,
    card.oneLine,
    card.body.background,
    card.body.keyProgress,
    card.body.whyItMatters,
    card.body.userRelevance,
    card.body.whatToWatch
]
    .filter((value) => Boolean(value))
    .join("")
    .length;
const cardScore = (card, newCardIds) => importanceWeight[card.importance] +
    sectionWeight[card.section] +
    (newCardIds.has(card.id) ? 90 : 0) +
    publishedTimestamp(card) / 1e12;
const readingOrder = (cards) => [...cards].sort((left, right) => {
    const leftPage = Number.isFinite(left.homePage) ? left.homePage : 0;
    const rightPage = Number.isFinite(right.homePage) ? right.homePage : 0;
    if (leftPage !== rightPage) {
        return leftPage - rightPage;
    }
    return importanceWeight[right.importance] - importanceWeight[left.importance];
});
const capCards = (cards, newCardIds, maxCards) => [...cards]
    .sort((left, right) => cardScore(right, newCardIds) - cardScore(left, newCardIds))
    .slice(0, maxCards);
const mergeEquivalentCards = (left, right) => {
    const preferred = cardTextLength(right) > cardTextLength(left) ? right : left;
    const sourceLinks = [...(left.sourceLinks ?? []), ...(right.sourceLinks ?? [])]
        .filter((source, index, sources) => sources.findIndex((item) => item.url === source.url) === index);
    const images = [...(left.images ?? []), ...(right.images ?? [])]
        .filter((image, index, values) => values.findIndex((item) => item.url === image.url) === index);
    return {
        ...preferred,
        sourceLinks,
        images,
        tags: [...new Set([...(left.tags ?? []), ...(right.tags ?? [])])].slice(0, 8)
    };
};
const normalizedCardTitle = (card) => (card.title ?? "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
const sameDedupableEvent = (left, right) => {
    const leftUrls = sourceUrls(left);
    return right.sourceLinks.some((source) => leftUrls.has(source.url)) ||
        sameAnchoredEvent(left, right) ||
        normalizedCardTitle(left) === normalizedCardTitle(right);
};
const dedupeEventCards = (cards) => {
    const result = [];
    cards.forEach((card) => {
        const duplicateIndex = result.findIndex((existing) => sameDedupableEvent(existing, card));
        if (duplicateIndex < 0) {
            result.push(card);
            return;
        }
        result[duplicateIndex] = mergeEquivalentCards(result[duplicateIndex], card);
    });
    return result;
};
const mergeEditionIssue = (params) => {
    const incoming = dedupeEventCards(params.incrementalIssue.cards.filter((newCard) => !params.baseIssue.cards.some((baseCard) => unchangedEvent(baseCard, newCard))));
    const replacedCardIds = params.baseIssue.cards
        .filter((baseCard) => incoming.some((newCard) => sameEvent(baseCard, newCard)))
        .map((card) => card.id);
    const survivingBase = params.baseIssue.cards.filter((baseCard) => !incoming.some((newCard) => sameEvent(baseCard, newCard)));
    const newCardIds = new Set(incoming.map((card) => card.id));
    const cards = readingOrder(capCards(dedupeEventCards([...incoming, ...survivingBase]), newCardIds, Math.max(1, params.maxCards)).map(translation_1.normalizeBriefingCardChinese));
    const selectedIds = new Set(cards.map((card) => card.id));
    const addedCardIds = incoming
        .map((card) => card.id)
        .filter((id) => selectedIds.has(id));
    const carriedCardIds = cards
        .map((card) => card.id)
        .filter((id) => !newCardIds.has(id));
    const totalChars = cards.reduce((sum, card) => sum + cardTextLength(card), 0);
    const topCard = cards.find((card) => card.importance === "S") ?? cards[0];
    return {
        issue: {
            ...params.incrementalIssue,
            cards,
            estimatedReadMinutes: cards.length ? Math.max(1, Math.ceil(totalChars / 450)) : 0,
            pageCount: (0, dailyIssueBuilder_1.calculateDailyIssuePageCount)(cards.length),
            topCardId: topCard?.id,
            basedOnGeneratedAt: params.baseIssue.generatedAt,
            editionCardIds: addedCardIds,
            carriedCardIds
        },
        addedCardIds,
        carriedCardIds,
        replacedCardIds
    };
};
exports.mergeEditionIssue = mergeEditionIssue;

