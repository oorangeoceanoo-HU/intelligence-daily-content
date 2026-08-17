"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDailyIssuePageCount = exports.getDailyIssueSelectionBand = exports.defaultDailyIssueSizingRules = void 0;
exports.buildDailyIssue = buildDailyIssue;
const importanceWeight = {
    S: 400,
    A: 300,
    B: 200,
    C: 100
};
const sectionWeight = {
    front: 120,
    risk: 110,
    china: 100,
    world: 95,
    local: 90,
    ai: 84,
    product: 82,
    industry: 80,
    light: 45,
    friends: 20
};
exports.defaultDailyIssueSizingRules = {
    minimumCards: 15,
    comfortableMaxCards: 20,
    absoluteMaxCards: 24,
    standardMinScore: 52,
    exceptionalMinScore: 68
};
const normalizeSizingRules = (overrides = {}) => {
    const minimumCards = Math.max(1, Math.floor(overrides.minimumCards ?? exports.defaultDailyIssueSizingRules.minimumCards));
    const comfortableMaxCards = Math.max(minimumCards, Math.floor(overrides.comfortableMaxCards ?? exports.defaultDailyIssueSizingRules.comfortableMaxCards));
    const absoluteMaxCards = Math.max(comfortableMaxCards, Math.floor(overrides.absoluteMaxCards ?? exports.defaultDailyIssueSizingRules.absoluteMaxCards));
    return {
        minimumCards,
        comfortableMaxCards,
        absoluteMaxCards,
        standardMinScore: overrides.standardMinScore ?? exports.defaultDailyIssueSizingRules.standardMinScore,
        exceptionalMinScore: overrides.exceptionalMinScore ?? exports.defaultDailyIssueSizingRules.exceptionalMinScore
    };
};
const getDailyIssueSelectionBand = (params) => {
    const rules = normalizeSizingRules(params.rules);
    if (params.selectedCount < rules.minimumCards) {
        return "minimum";
    }
    if (params.selectedCount < rules.comfortableMaxCards) {
        return params.importance !== "C" && params.finalScore >= rules.standardMinScore
            ? "standard"
            : undefined;
    }
    if (params.selectedCount < rules.absoluteMaxCards) {
        const isExceptional = params.importance === "S" ||
            params.importance === "A" ||
            params.finalScore >= rules.exceptionalMinScore;
        return isExceptional ? "exceptional" : undefined;
    }
    return undefined;
};
exports.getDailyIssueSelectionBand = getDailyIssueSelectionBand;
const emptyImportanceCounts = () => ({
    S: 0,
    A: 0,
    B: 0,
    C: 0
});
const emptySectionCounts = () => ({
    front: 0,
    world: 0,
    china: 0,
    local: 0,
    industry: 0,
    ai: 0,
    product: 0,
    risk: 0,
    friends: 0,
    light: 0
});
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
const DAY_MS = 24 * 60 * 60 * 1000;
const calendarDay = (value) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/u);
    return match
        ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : undefined;
};
const recencyWeight = (card, issueDate) => {
    const publishedDay = calendarDay(card.sourceLinks[0]?.publishedAt);
    const issueDay = calendarDay(issueDate);
    if (publishedDay === undefined || issueDay === undefined) {
        return 0;
    }
    const ageDays = Math.max(0, Math.floor((issueDay - publishedDay) / DAY_MS));
    return [140, 115, 90, 65, 40, 25, 12, 4][Math.min(ageDays, 7)] ?? 0;
};
const markBackgroundFiller = (card, issueDate) => {
    const publishedDay = calendarDay(card.sourceLinks[0]?.publishedAt);
    const issueDay = calendarDay(issueDate);
    if (publishedDay === undefined || issueDay === undefined) {
        return card;
    }
    const ageDays = Math.floor((issueDay - publishedDay) / DAY_MS);
    if (ageDays <= 3 || /^(背景补充|风险概览)：/u.test(card.oneLine)) {
        return card;
    }
    return {
        ...card,
        oneLine: `背景补充：${card.oneLine.replace(/^[^：]{2,8}：/u, "")}`
    };
};
const scoreCard = (card, rankScore, issueDate) => importanceWeight[card.importance] +
    recencyWeight(card, issueDate) +
    sectionWeight[card.section] +
    rankScore * 0.1;
const sortForIssue = (items, issueDate) => [...items].sort((a, b) => {
    const scoreDiff = scoreCard(b.card, b.rankedCandidate.finalScore, issueDate) -
        scoreCard(a.card, a.rankedCandidate.finalScore, issueDate);
    if (scoreDiff !== 0) {
        return scoreDiff;
    }
    return b.rankedCandidate.finalScore - a.rankedCandidate.finalScore;
});
const canAddCard = (card, sectionCounts, importanceCounts, sourceCounts) => {
    const primarySourceId = card.sourceLinks[0]?.sourceId ?? "unknown";
    if ((sourceCounts[primarySourceId] ?? 0) >= 4) {
        return false;
    }
    if (card.importance === "C" && importanceCounts.C >= 2) {
        return false;
    }
    if (card.section === "light" && sectionCounts.light >= 2) {
        return false;
    }
    if (card.section === "friends") {
        return false;
    }
    if (sectionCounts[card.section] >= 8) {
        return false;
    }
    return true;
};
const canAddMinimumFallback = (card, sectionCounts, importanceCounts, sourceCounts) => {
    const primarySourceId = card.sourceLinks[0]?.sourceId ?? "unknown";
    return (card.section !== "friends" &&
        (sourceCounts[primarySourceId] ?? 0) < 5 &&
        (card.importance !== "C" || importanceCounts.C < 3) &&
        sectionCounts[card.section] < 10);
};
const selectIssueCards = (items, issueDate, sizingOverrides = {}) => {
    const sizingRules = normalizeSizingRules(sizingOverrides);
    const sectionCounts = emptySectionCounts();
    const importanceCounts = emptyImportanceCounts();
    const sourceCounts = {};
    const selected = [];
    const skipped = [];
    const sizing = {
        minimumCards: sizingRules.minimumCards,
        comfortableMaxCards: sizingRules.comfortableMaxCards,
        absoluteMaxCards: sizingRules.absoluteMaxCards,
        minimumBandCount: 0,
        standardBandCount: 0,
        exceptionalBandCount: 0
    };
    sortForIssue(items, issueDate).forEach((item) => {
        const selectionBand = (0, exports.getDailyIssueSelectionBand)({
            selectedCount: selected.length,
            importance: item.card.importance,
            finalScore: item.rankedCandidate.finalScore,
            rules: sizingRules
        });
        if (!selectionBand || !canAddCard(item.card, sectionCounts, importanceCounts, sourceCounts)) {
            skipped.push(item);
            return;
        }
        selected.push(item);
        sizing[`${selectionBand}BandCount`] += 1;
        sectionCounts[item.card.section] += 1;
        importanceCounts[item.card.importance] += 1;
        const primarySourceId = item.card.sourceLinks[0]?.sourceId ?? "unknown";
        sourceCounts[primarySourceId] = (sourceCounts[primarySourceId] ?? 0) + 1;
    });
    if (selected.length < sizingRules.minimumCards) {
        [...skipped].forEach((item) => {
            if (selected.length >= sizingRules.minimumCards ||
                !canAddMinimumFallback(item.card, sectionCounts, importanceCounts, sourceCounts)) {
                return;
            }
            selected.push(item);
            sizing.minimumBandCount += 1;
            sectionCounts[item.card.section] += 1;
            importanceCounts[item.card.importance] += 1;
            const primarySourceId = item.card.sourceLinks[0]?.sourceId ?? "unknown";
            sourceCounts[primarySourceId] = (sourceCounts[primarySourceId] ?? 0) + 1;
            skipped.splice(skipped.indexOf(item), 1);
        });
    }
    return {
        selected,
        skipped,
        sizing,
        sectionCounts,
        importanceCounts
    };
};
const orderedForReading = (cards) => [...cards].sort((a, b) => {
    const importanceDiff = importanceWeight[b.importance] - importanceWeight[a.importance];
    if (importanceDiff !== 0) {
        return importanceDiff;
    }
    return sectionWeight[b.section] - sectionWeight[a.section];
});
const calculateDailyIssuePageCount = (cardCount) => {
    if (cardCount <= 0) {
        return 0;
    }
    // Prefer five to eight cards per page. A nine-card quiet day stays on one
    // page rather than creating a sparse second page with only four cards.
    if (cardCount <= 9) {
        return 1;
    }
    return Math.min(3, Math.max(2, Math.ceil(cardCount / 8)));
};
exports.calculateDailyIssuePageCount = calculateDailyIssuePageCount;
function buildDailyIssue(params) {
    const generatedAt = params.generatedAt ?? new Date().toISOString();
    const explicitMaxCards = params.maxCards
        ? Math.max(1, Math.floor(params.maxCards))
        : undefined;
    const selectedResult = selectIssueCards(params.publishableCards, params.date, {
        ...params.sizingRules,
        minimumCards: explicitMaxCards
            ? Math.min(params.sizingRules?.minimumCards ?? exports.defaultDailyIssueSizingRules.minimumCards, explicitMaxCards)
            : params.sizingRules?.minimumCards,
        comfortableMaxCards: explicitMaxCards
            ? Math.min(params.sizingRules?.comfortableMaxCards ?? exports.defaultDailyIssueSizingRules.comfortableMaxCards, explicitMaxCards)
            : params.sizingRules?.comfortableMaxCards,
        absoluteMaxCards: explicitMaxCards ?? params.sizingRules?.absoluteMaxCards
    });
    const cards = orderedForReading(selectedResult.selected.map((item) => markBackgroundFiller(item.card, params.date)));
    const totalChars = cards.reduce((sum, card) => sum + cardTextLength(card), 0);
    const estimatedReadMinutes = cards.length ? Math.max(1, Math.ceil(totalChars / 450)) : 0;
    const pageCount = (0, exports.calculateDailyIssuePageCount)(cards.length);
    const topCard = cards.find((card) => card.importance === "S") ?? cards[0];
    return {
        issue: {
            id: `daily-${params.userId}-${params.date}`,
            date: params.date,
            userId: params.userId,
            cards,
            estimatedReadMinutes,
            pageCount,
            topCardId: topCard?.id,
            generatedAt,
            pushSlots: params.pushSlots ?? ["07:30", "12:30", "21:30"],
            edition: params.edition,
            editionLabel: params.editionLabel,
            coverageWindow: params.coverageWindow,
            basedOnGeneratedAt: params.basedOnGeneratedAt
        },
        stats: {
            inputCardCount: params.publishableCards.length,
            selectedCardCount: cards.length,
            skippedCardCount: selectedResult.skipped.length,
            sizing: selectedResult.sizing,
            sectionCounts: selectedResult.sectionCounts,
            importanceCounts: selectedResult.importanceCounts
        },
        skippedCards: selectedResult.skipped.map((item) => item.card)
    };
}
