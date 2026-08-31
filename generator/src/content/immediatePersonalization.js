"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePersonalizationPoolDocument = void 0;
exports.buildImmediatePersonalizedIssue = buildImmediatePersonalizedIssue;
const personalizedIssue_1 = require("./personalizedIssue");
const parsePersonalizationPoolDocument = (value) => {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    const document = value;
    if (!document.issue ||
        typeof document.issue.date !== "string" ||
        !Array.isArray(document.personalizationPool) ||
        !document.personalizationPool.length) {
        return undefined;
    }
    const validPool = document.personalizationPool.every((item) => Boolean(item &&
        typeof item === "object" &&
        item.candidate &&
        typeof item.candidate.id === "string" &&
        item.card &&
        typeof item.card.id === "string"));
    return validPool ? document : undefined;
};
exports.parsePersonalizationPoolDocument = parsePersonalizationPoolDocument;
function buildImmediatePersonalizedIssue(params) {
    if (params.poolDocument.issue.date !== params.publicIssue.date) {
        return undefined;
    }
    const edition = params.publicIssue.edition ?? params.poolDocument.meta?.edition ?? "morning";
    const result = (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
        userId: params.userId,
        profile: params.profile,
        preferences: params.preferences,
        pool: params.poolDocument.personalizationPool,
        date: params.publicIssue.date,
        edition,
        editionLabel: params.publicIssue.editionLabel ?? edition,
        coverageWindow: params.publicIssue.coverageWindow,
        generatedAt: params.poolDocument.meta?.generatedAt ?? params.publicIssue.generatedAt
    });
    return (0, personalizedIssue_1.isUsablePersonalizedIssue)(result.issue) ? result.issue : undefined;
}
