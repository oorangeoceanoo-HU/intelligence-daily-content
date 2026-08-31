"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterRawItemsForEdition = exports.filterCandidatesForEdition = exports.assessEditionFreshness = exports.coverageWindowFor = void 0;
const dayAtShanghai = (date) => new Date(`${date}T00:00:00+08:00`).getTime();
const previousDate = (date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
}).format(new Date(dayAtShanghai(date) - 24 * 60 * 60 * 1000));
const shanghaiDateTime = (date, time) => `${date}T${time}:00+08:00`;
const coverageWindowFor = (date, edition) => {
    if (edition === "morning") {
        return {
            // The unattended daily issue is generated at 10:00 China time. Include
            // the full previous calendar day so slower-moving industry sources have
            // enough high-quality material without admitting content older than one day.
            start: shanghaiDateTime(previousDate(date), "00:00"),
            end: shanghaiDateTime(date, "10:00")
        };
    }
    if (edition === "midday") {
        return {
            start: shanghaiDateTime(date, "07:10"),
            end: shanghaiDateTime(date, "12:10")
        };
    }
    return {
        start: shanghaiDateTime(date, "12:10"),
        end: shanghaiDateTime(date, "21:10")
    };
};
exports.coverageWindowFor = coverageWindowFor;
const calendarDay = (value) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/u);
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};
const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?(?:[+-]\d{2}:?\d{2})?)?$/u.test(value);
const assessEditionFreshness = (item, issueDate, edition, asOf) => {
    const publishedAt = item.publishedAt ?? item.updatedAt;
    const publishedDay = calendarDay(publishedAt);
    const issueDay = calendarDay(issueDate);
    if (publishedDay === undefined || issueDay === undefined || !publishedAt) {
        return { eligible: false, reason: "缺少可验证的发布时间" };
    }
    if (publishedDay > issueDay) {
        return { eligible: false, reason: "发布时间晚于日报日期" };
    }
    // Many official lists expose a date but no time. Treat that as a day-level
    // timestamp and keep it inside the edition's calendar boundary only.
    if (isDateOnly(publishedAt)) {
        const allowedDays = edition === "morning"
            ? new Set([issueDay, issueDay - 24 * 60 * 60 * 1000])
            : new Set([issueDay]);
        if (publishedDay === issueDay && asOf) {
            const window = (0, exports.coverageWindowFor)(issueDate, edition);
            const asOfTimestamp = new Date(asOf).getTime();
            const windowEnd = new Date(window.end).getTime();
            if (Number.isFinite(asOfTimestamp) && asOfTimestamp > windowEnd) {
                return { eligible: false, reason: "日期来源没有具体时刻，错过本版次生成窗口后不能倒推为当时已发布" };
            }
        }
        return allowedDays.has(publishedDay)
            ? { eligible: true, reason: "日期在当前版次范围内" }
            : { eligible: false, reason: "日期早于当前版次范围" };
    }
    const window = (0, exports.coverageWindowFor)(issueDate, edition);
    const publishedTimestamp = new Date(publishedAt).getTime();
    const start = new Date(window.start).getTime();
    const end = new Date(window.end).getTime();
    if ([publishedTimestamp, start, end].some(Number.isNaN)) {
        return { eligible: false, reason: "发布时间格式无法验证" };
    }
    return publishedTimestamp >= start && publishedTimestamp <= end
        ? { eligible: true, reason: "发布时间在当前版次窗口内" }
        : { eligible: false, reason: "发布时间不在当前版次窗口内" };
};
exports.assessEditionFreshness = assessEditionFreshness;
const filterCandidatesForEdition = (items, issueDate, edition, asOf) => items.filter((item) => (0, exports.assessEditionFreshness)(item, issueDate, edition, asOf).eligible);
exports.filterCandidatesForEdition = filterCandidatesForEdition;
exports.filterRawItemsForEdition = exports.filterCandidatesForEdition;
