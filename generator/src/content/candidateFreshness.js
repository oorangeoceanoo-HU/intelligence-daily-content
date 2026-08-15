"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterFreshCandidates = exports.assessCandidateFreshness = void 0;
const DAY_MS = 24 * 60 * 60 * 1000;
const calendarDay = (value) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
        return undefined;
    }
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};
/**
 * A daily briefing is a current issue, not an archive. We intentionally reject
 * undated and old candidates before article summarization so stale items cannot
 * consume the limited daily card slots.
 */
const assessCandidateFreshness = (candidate, issueDate, maxAgeDays = 7) => {
    const publishedAt = calendarDay(candidate.publishedAt);
    const issueTimestamp = calendarDay(issueDate);
    if (publishedAt === undefined || issueTimestamp === undefined) {
        return { eligible: false, reason: "缺少可验证的发布时间" };
    }
    const ageDays = (issueTimestamp - publishedAt) / DAY_MS;
    if (ageDays < 0) {
        return { eligible: false, ageDays, reason: "发布时间晚于日报日期" };
    }
    if (ageDays > maxAgeDays) {
        return { eligible: false, ageDays, reason: `发布时间距日报超过 ${maxAgeDays} 天` };
    }
    return { eligible: true, ageDays, reason: ageDays <= 3 ? "近三日内容" : "七日内内容" };
};
exports.assessCandidateFreshness = assessCandidateFreshness;
const filterFreshCandidates = (candidates, issueDate, maxAgeDays = 7) => candidates.filter((candidate) => (0, exports.assessCandidateFreshness)(candidate, issueDate, maxAgeDays).eligible);
exports.filterFreshCandidates = filterFreshCandidates;
