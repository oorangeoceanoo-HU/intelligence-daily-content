"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCardDraftsForProfile = buildCardDraftsForProfile;
const articleDetails_1 = require("./articleDetails");
const candidateGenerator_1 = require("./candidateGenerator");
const cardDraftQuality_1 = require("./cardDraftQuality");
const cardDraftRepair_1 = require("./cardDraftRepair");
const translation_1 = require("./translation");
const detailForCandidate = (details, candidate) => details.find((detail) => detail.candidateId === candidate.id);
const finalCardForRepair = (card, repairResult) => (repairResult.changed ? repairResult.card : card);
const finalReportForRepair = (report, repairResult) => (repairResult.changed ? repairResult.repairedReport : report);
async function buildCardDraftsForProfile(params) {
    const generatedAt = params.generatedAt ?? new Date().toISOString();
    const issuePreview = (0, candidateGenerator_1.buildCandidateIssuePreview)(params.profileName, params.profile, params.candidates, params.limit);
    const selectedCandidates = (params.includeAllCandidates
        ? issuePreview.rankedCandidates
        : issuePreview.selectedCandidates).slice(0, params.limit);
    const fetchedDetails = await (0, articleDetails_1.fetchArticleDetails)(selectedCandidates.map((ranked) => ranked.candidate));
    const details = await (0, translation_1.translateArticleDetails)(fetchedDetails);
    const cards = selectedCandidates.map((ranked) => {
        const detail = detailForCandidate(details, ranked.candidate);
        const enrichedCandidate = detail
            ? (0, articleDetails_1.enrichCandidateWithArticleDetail)(ranked.candidate, detail)
            : ranked.candidate;
        return (0, candidateGenerator_1.rankedCandidateToCard)({
            ...ranked,
            candidate: enrichedCandidate
        }, generatedAt);
    });
    const qualityReports = cards.map((card, index) => (0, cardDraftQuality_1.evaluateCardDraftQuality)(card, details[index]));
    const repairResults = cards.map((card, index) => (0, cardDraftRepair_1.repairCardDraft)(card, qualityReports[index], details[index]));
    const publishableCards = [];
    const rejectedCards = [];
    cards.forEach((card, index) => {
        const repairResult = repairResults[index];
        const originalReport = qualityReports[index];
        const finalReport = finalReportForRepair(originalReport, repairResult);
        const finalCard = (0, translation_1.normalizeBriefingCardChinese)(finalCardForRepair(card, repairResult));
        const item = {
            card: finalCard,
            rankedCandidate: selectedCandidates[index],
            detail: details[index],
            originalReport,
            finalReport,
            repairResult
        };
        if (finalReport.publishable) {
            publishableCards.push(item);
        }
        else {
            rejectedCards.push(item);
        }
    });
    return {
        profileName: params.profileName,
        selectedCandidates,
        details,
        cards,
        qualityReports,
        repairResults,
        publishableCards,
        rejectedCards,
        generatedAt
    };
}
