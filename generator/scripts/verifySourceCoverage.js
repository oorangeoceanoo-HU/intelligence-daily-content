"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sourceCoverage_1 = require("../src/content/sourceCoverage");
const nodeRequire = typeof require === "function" ? require : undefined;
if (!nodeRequire) {
    throw new Error("Node runtime is required");
}
const assert = nodeRequire("node:assert/strict");
const result = (sourceId, ok = true, itemCount = 1, publishedAt = "2026-08-17T04:00:00.000Z") => ({
    sourceId,
    sourceName: sourceId,
    ok,
    fetchedAt: "2026-08-17T04:30:00.000Z",
    method: "web",
    endpointUrl: `https://example.com/${sourceId}`,
    attempts: 1,
    durationMs: 100,
    fallbackUsed: false,
    items: ok
        ? Array.from({ length: itemCount }, (_, index) => ({
            id: `${sourceId}-${index}`,
            sourceId,
            title: `${sourceId} item ${index}`,
            url: `https://example.com/${sourceId}/${index}`,
            publishedAt,
            language: "zh",
            fetchedAt: "2026-08-17T04:30:00.000Z"
        }))
        : [],
    error: ok ? undefined : "test failure"
});
const healthy = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world"),
    result("npr-world-rss"),
    result("mfa-cn-news"),
    result("mofcom-trade"),
    result("mem-cn"),
    result("gdacs-feed"),
    result("xinhua-tech"),
    result("openai-news"),
    result("arxiv-cs-api")
]);
assert.equal(healthy.ready, true, "四条核心内容通道有足够来源时应允许进入内容复核");
assert.equal(healthy.lanes.find((lane) => lane.id === "local")?.ready, false, "共享日报尚未接入用户城市来源，覆盖报告必须持续暴露这个缺口");
const brokenGlobal = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world"),
    result("npr-world-rss", false),
    result("mfa-cn-news"),
    result("mofcom-trade"),
    result("mem-cn"),
    result("gdacs-feed"),
    result("xinhua-tech"),
    result("openai-news"),
    result("arxiv-cs-api")
]);
assert.equal(brokenGlobal.ready, false, "国际通道只剩一个来源时必须阻止把稿件当成完整日报");
assert.equal(brokenGlobal.lanes.find((lane) => lane.id === "global")?.failedSourceIds.includes("npr-world-rss"), true, "覆盖报告应列出失败来源");
const scheduledHealthy = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world", true, 1, "2026-08-16T19:00:00.000Z"),
    result("npr-world-rss", true, 1, "2026-08-16T20:00:00.000Z"),
    result("mfa-cn-news", true, 1, "2026-08-16T21:00:00.000Z"),
    result("mofcom-trade", true, 1, "2026-08-16T22:00:00.000Z"),
    result("mem-cn", true, 1, "2026-08-16T23:00:00.000Z"),
    result("gdacs-feed", true, 1, "2026-08-17T00:00:00.000Z"),
    result("xinhua-tech", true, 1, "2026-08-17T00:30:00.000Z"),
    result("openai-news", true, 1, "2026-08-17T01:00:00.000Z"),
    result("arxiv-cs-api", true, 1, "2026-08-17T01:30:00.000Z")
], {
    issueDate: "2026-08-17",
    edition: "morning",
    asOf: "2026-08-17T07:40:00+08:00"
});
assert.equal(scheduledHealthy.currentCoverageReady, true, "a scheduled run reports when its live intake is healthy");
assert.equal(scheduledHealthy.ready, true, "availability and live intake are both required for a ready scheduled run");
const incrementalSingleGlobalSource = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world", true, 1, "2026-08-16T20:00:00.000Z"),
    result("cnbc-world-rss", true, 1, "2026-08-17T02:00:00.000Z"),
    result("mfa-cn-news", true, 1, "2026-08-16T20:00:00.000Z"),
    result("mofcom-trade", true, 1, "2026-08-16T20:00:00.000Z"),
    result("mem-cn", true, 1, "2026-08-16T20:00:00.000Z"),
    result("gdacs-feed", true, 1, "2026-08-17T02:30:00.000Z"),
    result("xinhua-tech", true, 1, "2026-08-17T02:10:00.000Z"),
    result("openai-news", true, 1, "2026-08-16T20:00:00.000Z"),
    result("arxiv-cs-api", true, 1, "2026-08-16T20:00:00.000Z")
], {
    issueDate: "2026-08-17",
    edition: "midday",
    asOf: "2026-08-17T12:20:00+08:00"
});
assert.equal(incrementalSingleGlobalSource.currentCoverageReady, true, "a short incremental window accepts one current global source when the wider source pool is healthy");
assert.equal(incrementalSingleGlobalSource.lanes.find((lane) => lane.id === "global")?.minimumCurrentSources, 1, "midday and evening use a one-source live-input threshold");
const staleLiveCoverage = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world", true, 1, "2026-08-15T11:00:00.000Z"),
    result("npr-world-rss", true, 1, "2026-08-15T12:00:00.000Z"),
    result("mfa-cn-news", true, 1, "2026-08-16T21:00:00.000Z"),
    result("mofcom-trade", true, 1, "2026-08-16T22:00:00.000Z"),
    result("mem-cn", true, 1, "2026-08-16T23:00:00.000Z"),
    result("gdacs-feed", true, 1, "2026-08-17T00:00:00.000Z")
], {
    issueDate: "2026-08-17",
    edition: "morning",
    asOf: "2026-08-17T07:40:00+08:00"
});
assert.equal(staleLiveCoverage.currentCoverageReady, false, "stale feeds cannot be mistaken for current coverage");
assert.equal(staleLiveCoverage.ready, false, "a scheduled run with stale global intake is not ready");
const publicIssueWithEmptyCities = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world"),
    result("npr-world-rss"),
    result("mfa-cn-news"),
    result("mofcom-trade"),
    result("mem-cn"),
    result("gdacs-feed"),
    result("xinhua-tech"),
    result("openai-news"),
    result("arxiv-cs-api"),
    result("city-shanghai", true, 0)
], {
    localSourceIds: ["city-shanghai"]
});
assert.equal(publicIssueWithEmptyCities.ready, true, "公共日报不能因示例城市无新增而停止出版");
assert.equal(publicIssueWithEmptyCities.lanes.find((lane) => lane.id === "local")?.required, false, "公共日报中的城市来源只生成可见提示");
const personalizedIssueWithEmptyCities = (0, sourceCoverage_1.assessSourceCoverage)([
    result("xinhua-world"),
    result("npr-world-rss"),
    result("mfa-cn-news"),
    result("mofcom-trade"),
    result("mem-cn"),
    result("gdacs-feed"),
    result("xinhua-tech"),
    result("openai-news"),
    result("arxiv-cs-api"),
    result("city-shanghai", true, 0)
], {
    localSourceIds: ["city-shanghai"],
    requireLocalSources: true
});
assert.equal(personalizedIssueWithEmptyCities.ready, false, "城市专属日报仍需真实城市来源覆盖");
console.log("Source coverage regression checks passed.");
