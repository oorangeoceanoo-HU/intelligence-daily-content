"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shareRules_1 = require("../src/backend/shareRules");
const card = { id: "share-contract-card" };
const friends = [{ userId: "friend-1" }];
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};
assert((0, shareRules_1.canConfirmShare)("circle", undefined, []), "Circle share must work without friends");
assert((0, shareRules_1.canConfirmShare)("circle", "stale-target", []), "Circle share must ignore a target user");
assert(!(0, shareRules_1.canConfirmShare)("private", undefined, friends), "Private share must require a target");
assert((0, shareRules_1.canConfirmShare)("private", "friend-1", friends), "Private share must accept an existing friend");
assert(!(0, shareRules_1.canConfirmShare)("private", "unknown", friends), "Private share must reject an unknown target");
const circlePayload = (0, shareRules_1.buildShareInsertPayload)({
    authorId: "author-1",
    card,
    visibility: "circle",
    targetUserId: "should-be-cleared"
});
assert(circlePayload.target_user_id === null, "Circle payload must clear target_user_id");
const privatePayload = (0, shareRules_1.buildShareInsertPayload)({
    authorId: "author-1",
    card,
    visibility: "private",
    targetUserId: "friend-1"
});
assert(privatePayload.target_user_id === "friend-1", "Private payload must preserve target_user_id");
console.log("Share contract checks passed");
