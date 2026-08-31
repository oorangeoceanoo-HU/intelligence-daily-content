"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const editionFreshness_1 = require("../src/content/editionFreshness");
const assertEqual = (actual, expected, label) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
    }
};
const dated = (publishedAt) => ({ publishedAt, updatedAt: undefined });
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T00:00:00+08:00"), "2026-08-17", "morning", "2026-08-16T23:10:00.000Z").eligible, true, "same-day date-only items may enter a morning issue generated during the morning window");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T00:00:00+08:00"), "2026-08-17", "morning", "2026-08-17T07:00:00.000Z").eligible, false, "late regeneration cannot claim a date-only item was already available in the morning");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T10:15:00+08:00"), "2026-08-17", "midday").eligible, true, "midday accepts timestamped morning updates");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T13:15:00+08:00"), "2026-08-17", "midday").eligible, false, "midday rejects timestamped afternoon updates");
assertEqual((0, editionFreshness_1.coverageWindowFor)("2026-08-17", "evening").start, "2026-08-17T12:10:00+08:00", "evening starts after the midday cutoff");
assertEqual((0, editionFreshness_1.coverageWindowFor)("2026-08-17", "morning").start, "2026-08-16T00:00:00+08:00", "daily morning issue includes the full previous calendar day");
assertEqual((0, editionFreshness_1.coverageWindowFor)("2026-08-17", "morning").end, "2026-08-17T10:00:00+08:00", "daily morning issue closes at the 10:00 publication time");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T09:59:00+08:00"), "2026-08-17", "morning", "2026-08-17T02:00:00.000Z").eligible, true, "the 10:00 daily issue includes same-morning news");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T10:01:00+08:00"), "2026-08-17", "morning", "2026-08-17T02:00:00.000Z").eligible, false, "news after the daily cutoff waits for the next issue");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T07:11:00+08:00"), "2026-08-17", "midday", "2026-08-17T12:10:00+08:00").eligible, true, "the first minute after the morning task belongs to the midday update");
assertEqual((0, editionFreshness_1.assessEditionFreshness)(dated("2026-08-17T12:11:00+08:00"), "2026-08-17", "evening", "2026-08-17T21:10:00+08:00").eligible, true, "the first minute after the midday task belongs to the evening update");
console.log("Edition freshness regression checks passed.");
