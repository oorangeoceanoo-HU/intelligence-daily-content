"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const editionIssueMerger_1 = require("../src/content/editionIssueMerger");
const assertEqual = (actual, expected, label) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
    }
};
const card = (id, title, publishedAt, importance = "B") => ({
    id,
    title,
    oneLine: `${title}的一句话导读。`,
    importance,
    credibility: "主流媒体",
    tags: [],
    industries: [],
    section: "world",
    body: {
        background: `${title}的事件背景。`,
        keyProgress: `${title}的最新进展。`,
        whyItMatters: `${title}为什么重要。`,
        userRelevance: `${title}与用户的关系。`
    },
    sourceLinks: [{
            title,
            url: `https://example.com/${id}`,
            sourceId: "test",
            publishedAt
        }],
    images: [],
    generatedAt: "2026-08-17T00:00:00.000Z"
});
const issue = (edition, cards, generatedAt) => ({
    id: "daily-test-2026-08-17",
    date: "2026-08-17",
    userId: "test",
    cards,
    estimatedReadMinutes: 1,
    pageCount: 1,
    generatedAt,
    pushSlots: ["07:30", "12:30", "21:30"],
    edition
});
const baseCards = Array.from({ length: 15 }, (_, index) => card(`base-${index}`, `基础新闻 ${index}`, "2026-08-17T06:00:00+08:00"));
const newStory = card("new-1", "霍尔木兹海峡出现新的航运变化", "2026-08-17T10:00:00+08:00", "S");
const replacement = {
    ...card("replacement", "基础新闻 0 出现最新变化", "2026-08-17T10:30:00+08:00", "A"),
    sourceLinks: baseCards[0].sourceLinks
};
const result = (0, editionIssueMerger_1.mergeEditionIssue)({
    baseIssue: issue("morning", baseCards, "2026-08-17T00:00:00.000Z"),
    incrementalIssue: issue("midday", [newStory, replacement], "2026-08-17T04:00:00.000Z"),
    maxCards: 24
});
assertEqual(result.issue.cards.length, 16, "incremental update keeps the base and replaces one event");
assertEqual(result.addedCardIds.length, 2, "new edition card ids are recorded");
assertEqual(result.carriedCardIds.length, 14, "carried card ids are recorded");
assertEqual(result.replacedCardIds[0], "base-0", "same-source update replaces the older card");
assertEqual(result.issue.basedOnGeneratedAt, "2026-08-17T00:00:00.000Z", "base generation is traceable");
const unchangedResult = (0, editionIssueMerger_1.mergeEditionIssue)({
    baseIssue: issue("morning", baseCards, "2026-08-17T00:00:00.000Z"),
    incrementalIssue: issue("midday", [{ ...baseCards[1], generatedAt: "2026-08-17T04:00:00.000Z" }], "2026-08-17T04:00:00.000Z"),
    maxCards: 24
});
assertEqual(unchangedResult.addedCardIds.length, 0, "unchanged date-only content is not counted as a new update");
assertEqual(unchangedResult.carriedCardIds.length, 15, "unchanged cards remain carried from the base edition");
const ukraineAirRaidResult = (0, editionIssueMerger_1.mergeEditionIssue)({
    baseIssue: issue("morning", [
        card("ukraine-base", "乌克兰发动战争中最大规模的空袭之一，造成俄罗斯至少6人死亡", "2026-08-16T10:12:09.000Z", "S")
    ], "2026-08-17T00:00:00.000Z"),
    incrementalIssue: issue("evening", [
        card("ukraine-update", "乌克兰战争中最大规模的空袭之一后，俄罗斯瞄准多瑙河港口", "2026-08-17T09:46:08.000Z", "S")
    ], "2026-08-17T13:20:00.000Z"),
    maxCards: 24
});
assertEqual(ukraineAirRaidResult.issue.cards.length, 1, "the same Ukraine air-raid development is updated rather than duplicated");
assertEqual(ukraineAirRaidResult.replacedCardIds[0], "ukraine-base", "the earlier Ukraine air-raid card is replaced");
const carriedTranslationResult = (0, editionIssueMerger_1.mergeEditionIssue)({
    baseIssue: issue("morning", [
        card("literal-translation", "日本车企受到伊朗战争的一二拳", "2026-08-16T10:00:00.000Z")
    ], "2026-08-17T00:00:00.000Z"),
    incrementalIssue: issue("evening", [], "2026-08-17T13:20:00.000Z"),
    maxCards: 24
});
assertEqual(carriedTranslationResult.issue.cards[0]?.title, "日本车企受到伊朗战争的双重冲击", "carried cards receive the same Chinese normalization as new cards");
console.log("Edition issue merge regression checks passed.");
