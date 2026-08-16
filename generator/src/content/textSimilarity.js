"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textContainment = exports.textSimilarity = void 0;
const normalizeForSimilarity = (value) => value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
const bigrams = (value) => {
    const normalized = normalizeForSimilarity(value);
    if (normalized.length <= 2) {
        return new Set(normalized ? [normalized] : []);
    }
    const result = new Set();
    for (let index = 0; index < normalized.length - 1; index += 1) {
        result.add(normalized.slice(index, index + 2));
    }
    return result;
};
const textSimilarity = (a, b) => {
    if (!a || !b) {
        return 0;
    }
    const aSet = bigrams(a);
    const bSet = bigrams(b);
    if (!aSet.size || !bSet.size) {
        return 0;
    }
    const intersection = [...aSet].filter((item) => bSet.has(item)).length;
    const union = new Set([...aSet, ...bSet]).size;
    return intersection / union;
};
exports.textSimilarity = textSimilarity;
const textContainment = (needle, haystack) => {
    if (!needle || !haystack) {
        return 0;
    }
    const needleSet = bigrams(needle);
    const haystackSet = bigrams(haystack);
    if (!needleSet.size || !haystackSet.size) {
        return 0;
    }
    const intersection = [...needleSet].filter((item) => haystackSet.has(item)).length;
    return intersection / needleSet.size;
};
exports.textContainment = textContainment;
