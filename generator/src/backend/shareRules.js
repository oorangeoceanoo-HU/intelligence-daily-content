"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildShareInsertPayload = exports.canConfirmShare = void 0;
const canConfirmShare = (visibility, targetUserId, friends) => visibility === "circle" || friends.some((friend) => friend.userId === targetUserId);
exports.canConfirmShare = canConfirmShare;
const buildShareInsertPayload = (params) => ({
    author_id: params.authorId,
    card_id: params.card.id,
    visibility: params.visibility,
    target_user_id: params.visibility === "private" ? params.targetUserId ?? null : null,
    card_snapshot: params.card,
    note: params.note ?? ""
});
exports.buildShareInsertPayload = buildShareInsertPayload;
