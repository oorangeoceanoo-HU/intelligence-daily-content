"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dailyIssueBuilder_1 = require("../src/content/dailyIssueBuilder");
const assertEqual = (actual, expected, label) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
    }
};
const rules = dailyIssueBuilder_1.defaultDailyIssueSizingRules;
const sections = [
    "front",
    "risk",
    "china",
    "world",
    "local",
    "ai",
    "product",
    "industry"
];
const makeCards = (count, importance, finalScore, offset = 0, publishedAt = "2026-08-13") => Array.from({ length: count }, (_, index) => {
    const id = `sizing-${offset + index}`;
    return {
        card: {
            id,
            title: `Sizing test card ${id}`,
            oneLine: "This is a complete sizing test summary for the daily issue.",
            importance,
            credibility: "官方来源",
            tags: [importance],
            industries: ["generalPublic"],
            section: sections[index % sections.length],
            body: {
                background: "This background contains enough information for the sizing test.",
                keyProgress: "This progress field is distinct and complete for the sizing test.",
                whyItMatters: "This explains why the generated card matters to a reader."
            },
            sourceLinks: [
                {
                    title: "Sizing source",
                    url: `https://example.com/${id}`,
                    sourceId: `source-${id}`,
                    publishedAt
                }
            ],
            images: [],
            generatedAt: "2026-08-13T00:00:00.000Z"
        },
        rankedCandidate: { finalScore }
    };
});
const selectedCount = (cards) => (0, dailyIssueBuilder_1.buildDailyIssue)({
    userId: "sizing-test",
    date: "2026-08-13",
    publishableCards: cards,
    generatedAt: "2026-08-13T00:00:00.000Z"
}).issue.cards.length;
assertEqual((0, dailyIssueBuilder_1.getDailyIssueSelectionBand)({ selectedCount: 0, importance: "C", finalScore: 20, rules }), "minimum", "B/C cards may fill the minimum reading amount");
assertEqual((0, dailyIssueBuilder_1.getDailyIssueSelectionBand)({ selectedCount: rules.minimumCards, importance: "B", finalScore: 60, rules }), "standard", "useful B cards may extend the normal issue");
assertEqual((0, dailyIssueBuilder_1.getDailyIssueSelectionBand)({ selectedCount: rules.minimumCards, importance: "C", finalScore: 80, rules }), undefined, "C cards do not add bulk after the minimum");
assertEqual((0, dailyIssueBuilder_1.getDailyIssueSelectionBand)({ selectedCount: rules.comfortableMaxCards, importance: "A", finalScore: 70, rules }), "exceptional", "important cards may exceed the comfortable maximum");
assertEqual((0, dailyIssueBuilder_1.getDailyIssueSelectionBand)({ selectedCount: rules.comfortableMaxCards, importance: "B", finalScore: 60, rules }), undefined, "ordinary cards stop at the comfortable maximum");
assertEqual((0, dailyIssueBuilder_1.getDailyIssueSelectionBand)({ selectedCount: rules.absoluteMaxCards, importance: "S", finalScore: 100, rules }), undefined, "the absolute maximum is never exceeded");
assertEqual(selectedCount(makeCards(17, "B", 60)), 17, "a 17-card useful day remains 17 cards");
assertEqual((0, dailyIssueBuilder_1.calculateDailyIssuePageCount)(13), 2, "a 13-card day does not create a sparse third page");
assertEqual((0, dailyIssueBuilder_1.calculateDailyIssuePageCount)(17), 3, "a 17-card day keeps each of three pages comfortably readable");
assertEqual(selectedCount(makeCards(22, "B", 60)), 20, "ordinary B cards stop at the comfortable maximum");
assertEqual(selectedCount(makeCards(22, "B", 60)), 20, "ordinary cards stop at the comfortable maximum");
assertEqual(selectedCount(makeCards(22, "A", 75)), 22, "an important day may grow beyond the comfortable maximum");
assertEqual(selectedCount(makeCards(35, "A", 90)), 24, "even an exceptional day respects the absolute maximum");
assertEqual(selectedCount([...makeCards(13, "B", 60), ...makeCards(2, "C", 45, 100)]), 15, "two relevant C cards may complete the minimum issue");
const recencyIssue = (0, dailyIssueBuilder_1.buildDailyIssue)({
    userId: "recency-test",
    date: "2026-08-17",
    publishableCards: [
        ...makeCards(15, "B", 60, 0, "2026-08-12"),
        ...makeCards(1, "B", 60, 100, "2026-08-17")
    ],
    maxCards: 15,
    generatedAt: "2026-08-17T00:00:00.000Z"
}).issue;
assertEqual(recencyIssue.cards.some((card) => card.id === "sizing-100"), true, "same-level current news is selected ahead of older filler");
assertEqual(recencyIssue.cards.find((card) => card.id === "sizing-0")?.oneLine.startsWith("背景补充："), true, "older filler is visibly marked as background context");
const sourceBalancedIssue = (0, dailyIssueBuilder_1.buildDailyIssue)({
    userId: "source-balance-test",
    date: "2026-08-17",
    publishableCards: Array.from({ length: 4 }, (_, sourceIndex) => makeCards(4, "B", 60, sourceIndex * 10, "2026-08-17").map((item) => ({
        ...item,
        card: {
            ...item.card,
            sourceLinks: item.card.sourceLinks.map((link) => ({
                ...link,
                sourceId: `balanced-source-${sourceIndex}`
            }))
        }
    }))).flat(),
    maxCards: 24,
    generatedAt: "2026-08-17T00:00:00.000Z"
}).issue;
assertEqual(sourceBalancedIssue.cards.length, 16, "four strong cards per source may be retained so the issue can grow beyond the 15-card minimum");
console.log("Dynamic daily issue sizing rules verified.");
