"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupeCandidateItems = dedupeCandidateItems;
const textSimilarity_1 = require("./textSimilarity");
const unique = (items) => Array.from(new Set(items));
const hasAny = (items, targets) => items.some((item) => targets.includes(item));
const normalizeText = (value) => value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const compactKey = (value) => normalizeText(value)
    .replace(/\s+/g, "-")
    .slice(0, 70);
const dayBucket = (value) => {
    const date = new Date(value ?? Date.now());
    if (Number.isNaN(date.getTime())) {
        return "unknown-day";
    }
    return date.toISOString().slice(0, 10);
};
const representativeTitleQuality = (candidate) => {
    const title = candidate.title.toLowerCase();
    let score = 0;
    if (/最新|进展|宣布|回应|升至|生效|达成|中断|恢复|袭击|停火|制裁|关税|通航|部署|resigns|announces|agrees|halts|strikes|ceasefire/u.test(title)) {
        score += 22;
    }
    if (/热点问答|问答|评论|观察|解读|能实现吗|为什么|怎么看|analysis|opinion|explainer/u.test(title)) {
        score -= 24;
    }
    return score;
};
const candidatePriority = (candidate) => candidate.impactScore * 0.34 +
    candidate.severityScore * 0.26 +
    candidate.freshnessScore * 0.2 +
    candidate.trendScore * 0.2 +
    representativeTitleQuality(candidate);
const disasterType = (candidate) => {
    const text = normalizeText(`${candidate.title} ${candidate.body.keyProgress}`);
    if (/\bearthquake\b/.test(text) || text.includes("地震")) {
        return "earthquake";
    }
    if (/\bvolcan/.test(text) || text.includes("火山")) {
        return "volcano";
    }
    if (/\bflood\b/.test(text) || text.includes("洪水")) {
        return "flood";
    }
    if (/\bcyclone\b|\bhurricane\b|\btyphoon\b|\bstorm\b/.test(text) || text.includes("台风")) {
        return "storm";
    }
    if (/\bwildfire\b|\bfire\b/.test(text) || text.includes("山火")) {
        return "wildfire";
    }
    return "risk";
};
const locationFromTitle = (candidate) => {
    const titleLocation = candidate.locations.find((location) => !["中国", "全球"].includes(location) && candidate.title.includes(location));
    if (titleLocation) {
        return titleLocation;
    }
    const specificLocation = candidate.locations.find((location) => !["中国", "全球"].includes(location));
    if (specificLocation) {
        return specificLocation;
    }
    if (candidate.locations.length) {
        return candidate.locations[0];
    }
    const normalized = normalizeText(candidate.title);
    const inMatch = normalized.match(/\bin\s+([a-z][a-z\s-]+?)(?:\s+\d{2}\/|\s+\d{4}|\s+\[|,|$)/i);
    if (inMatch) {
        return inMatch[1].trim();
    }
    return candidate.regions[0] ?? "global";
};
const titleTokens = (candidate) => normalizeText(candidate.title)
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !["with", "from", "this", "that", "into", "across", "using", "based"].includes(token));
const tokenSimilarity = (a, b) => {
    const aTokens = new Set(titleTokens(a));
    const bTokens = new Set(titleTokens(b));
    if (!aTokens.size || !bTokens.size) {
        return 0;
    }
    const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    return intersection / union;
};
const titleEventSimilarity = (a, b) => Math.max(tokenSimilarity(a, b), (0, textSimilarity_1.textSimilarity)(a.title, b.title), Math.min((0, textSimilarity_1.textContainment)(a.title, b.title), (0, textSimilarity_1.textContainment)(b.title, a.title)));
const disasterEventSignature = (candidate) => {
    const text = candidate.title;
    const magnitude = text.match(/Magnitude\s*([\d.]+)M?/i)?.[1];
    const timestamp = text.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i)?.[1];
    return magnitude && timestamp ? `${magnitude}:${timestamp}` : undefined;
};
const riskClusterKey = (candidate) => `risk:${disasterType(candidate)}:${compactKey(locationFromTitle(candidate))}:${dayBucket(candidate.publishedAt)}`;
const exactTitleKey = (candidate) => `title:${compactKey(candidate.title)}:${dayBucket(candidate.publishedAt)}`;
const baseClusterKey = (candidate) => {
    if (hasAny(candidate.categories, ["disaster", "publicSafety"])) {
        return riskClusterKey(candidate);
    }
    return exactTitleKey(candidate);
};
const shouldJoinCluster = (candidate, cluster) => {
    const first = cluster[0];
    if (!first) {
        return false;
    }
    const bothRisk = hasAny(candidate.categories, ["disaster", "publicSafety"]) &&
        hasAny(first.categories, ["disaster", "publicSafety"]);
    const sameBaseKey = baseClusterKey(candidate) === baseClusterKey(first);
    if (sameBaseKey && !bothRisk) {
        return true;
    }
    if (dayBucket(candidate.publishedAt) !== dayBucket(first.publishedAt) && !bothRisk) {
        return false;
    }
    if (bothRisk) {
        const candidateSignature = disasterEventSignature(candidate);
        const firstSignature = disasterEventSignature(first);
        if (candidateSignature && firstSignature) {
            return candidateSignature === firstSignature;
        }
        return (disasterType(candidate) === disasterType(first) &&
            compactKey(locationFromTitle(candidate)) === compactKey(locationFromTitle(first)) &&
            titleEventSimilarity(candidate, first) >= 0.2);
    }
    return (candidate.categories.some((category) => first.categories.includes(category)) &&
        titleEventSimilarity(candidate, first) >= 0.24);
};
const uniqueLinks = (links) => {
    const seen = new Set();
    return links.filter((link) => {
        const key = `${link.sourceId}:${link.url}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
const uniqueImages = (images) => {
    const seen = new Set();
    return images.filter((image) => {
        if (seen.has(image.url)) {
            return false;
        }
        seen.add(image.url);
        return true;
    });
};
const mergeCluster = (cluster) => {
    const representative = [...cluster].sort((a, b) => candidatePriority(b) - candidatePriority(a))[0];
    if (!representative || cluster.length === 1) {
        return representative ?? cluster[0];
    }
    const orderedCluster = [
        representative,
        ...cluster.filter((candidate) => candidate.id !== representative.id)
    ];
    const sourceIds = unique(orderedCluster.flatMap((candidate) => candidate.sourceIds));
    const categories = unique(orderedCluster.flatMap((candidate) => candidate.categories));
    const industries = unique(orderedCluster.flatMap((candidate) => candidate.industries));
    const locations = unique(orderedCluster.flatMap((candidate) => candidate.locations));
    const sourceLinks = uniqueLinks(orderedCluster.flatMap((candidate) => candidate.sourceLinks));
    const images = uniqueImages(orderedCluster.flatMap((candidate) => candidate.images));
    return {
        ...representative,
        id: `cluster-${representative.id}`,
        sourceIds,
        categories,
        industries,
        locations,
        sourceLinks,
        images,
        impactScore: Math.max(...cluster.map((candidate) => candidate.impactScore)),
        severityScore: Math.max(...cluster.map((candidate) => candidate.severityScore)),
        freshnessScore: Math.max(...cluster.map((candidate) => candidate.freshnessScore)),
        trendScore: Math.max(...cluster.map((candidate) => candidate.trendScore)),
        body: { ...representative.body }
    };
};
const clusterReason = (cluster) => {
    const first = cluster[0];
    if (!first) {
        return "空聚合";
    }
    if (hasAny(first.categories, ["disaster", "publicSafety"])) {
        return `同一日期、同一灾害类型和相近地区：${disasterType(first)} / ${locationFromTitle(first)}`;
    }
    return "标题高度相似或来自同一候选事件";
};
const clusterPreview = (cluster) => {
    const merged = mergeCluster(cluster);
    return {
        id: merged.id,
        title: merged.title,
        representativeId: cluster
            .slice()
            .sort((a, b) => candidatePriority(b) - candidatePriority(a))[0]?.id ?? merged.id,
        candidateIds: cluster.map((candidate) => candidate.id),
        sourceIds: unique(cluster.flatMap((candidate) => candidate.sourceIds)),
        categories: unique(cluster.flatMap((candidate) => candidate.categories)),
        industries: unique(cluster.flatMap((candidate) => candidate.industries)),
        locations: unique(cluster.flatMap((candidate) => candidate.locations)),
        reason: clusterReason(cluster)
    };
};
function dedupeCandidateItems(candidates) {
    const clusters = [];
    candidates.forEach((candidate) => {
        const matchedCluster = clusters.find((cluster) => shouldJoinCluster(candidate, cluster));
        if (matchedCluster) {
            matchedCluster.push(candidate);
        }
        else {
            clusters.push([candidate]);
        }
    });
    const mergedCandidates = clusters.map(mergeCluster);
    const clusterPreviews = clusters.filter((cluster) => cluster.length > 1).map(clusterPreview);
    return {
        candidates: mergedCandidates,
        clusters: clusterPreviews,
        removedCount: candidates.length - mergedCandidates.length
    };
}
