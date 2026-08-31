"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardContainsWebNoise = exports.containsWebNoise = void 0;
// These phrases are browser chrome or consent UI, not reporting content.
const webNoisePatterns = [
    /accept\s+(all\s+)?cookies?/iu,
    /manage\s+(my\s+)?choices/iu,
    /cookie\s+(settings|preferences|policy|notice)/iu,
    /privacy\s+(settings|policy|notice)/iu,
    /consent\s+(settings|preferences|notice)/iu,
    /necessary\s+cookies?/iu,
    /reject\s+all/iu,
    /subscribe\s+to\s+(our|the)\s+newsletter/iu,
    /sign\s*(in|up)|log\s*(in|out)|register/iu,
    /skip\s+to\s+(main\s+)?content/iu,
    /^(menu|navigation|home|search|share|close|next|previous)$/iu,
    /^(gov\.uk\s+menu|video\s+player|site\s+navigation)$/iu,
    /unsubscribe\s+from/iu
];
const containsWebNoise = (value) => webNoisePatterns.some((pattern) => pattern.test(value));
exports.containsWebNoise = containsWebNoise;
const cardContainsWebNoise = (card) => {
    const text = [
        card.title,
        card.oneLine,
        card.body.background,
        card.body.keyProgress,
        card.body.whyItMatters,
        card.body.userRelevance,
        card.body.whatToWatch,
        ...card.tags,
        ...card.sourceLinks.map((source) => source.title)
    ].filter(Boolean).join("\n");
    return (0, exports.containsWebNoise)(text);
};
exports.cardContainsWebNoise = cardContainsWebNoise;
