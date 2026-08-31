"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSavedCards = loadSavedCards;
exports.saveSavedCards = saveSavedCards;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const STORAGE_PREFIX = "today-newspaper:bookmarks:v1:";
const MAX_BOOKMARKS = 200;
const getStorageKey = (userId) => `${STORAGE_PREFIX}${userId || "local-user"}`;
const isSavedCard = (value) => {
    if (!value || typeof value !== "object") {
        return false;
    }
    const item = value;
    return (typeof item.savedAt === "string" &&
        Boolean(item.card) &&
        typeof item.card?.id === "string" &&
        typeof item.card?.title === "string");
};
async function loadSavedCards(userId) {
    try {
        const raw = await async_storage_1.default.getItem(getStorageKey(userId));
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isSavedCard).slice(0, MAX_BOOKMARKS) : [];
    }
    catch {
        return [];
    }
}
async function saveSavedCards(userId, items) {
    try {
        await async_storage_1.default.setItem(getStorageKey(userId), JSON.stringify(items.slice(0, MAX_BOOKMARKS)));
    }
    catch {
        // Local persistence failure should not interrupt reading.
    }
}
