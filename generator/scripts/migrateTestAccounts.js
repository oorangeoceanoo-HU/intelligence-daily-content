"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const baseUrl = (process.env.SUPABASE_URL ?? "")
  .trim()
  .replace(/\/rest\/v1\/?$/u, "")
  .replace(/\/$/u, "");
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const dryRun = process.argv.includes("--dry-run");
const outputArgIndex = process.argv.indexOf("--output");
const outputPath = outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
  ? process.argv[outputArgIndex + 1]
  : "tmp/test-account-migration.json";

if (!baseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const authHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  Accept: "application/json",
  "Content-Type": "application/json"
};

const normalizedPhone = (value) => String(value ?? "").replace(/\D/gu, "");
const accountEmail = (phone) => `test-${phone}@accounts.shixiaobao.test`;
const accountPassword = (phone) => `SxbAlpha-${phone}-010203!`;
const accountKey = (phone) => crypto.createHash("sha256").update(phone).digest("hex").slice(0, 10);

const authRequest = async (resource, options = {}) => {
  const response = await fetch(`${baseUrl}/auth/v1/${resource}`, {
    method: options.method ?? "GET",
    headers: authHeaders,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Auth API ${response.status}: ${responseText.slice(0, 300)}`);
  }
  return responseText ? JSON.parse(responseText) : undefined;
};

const listAuthUsers = async () => {
  const users = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const response = await authRequest(`admin/users?page=${page}&per_page=${perPage}`);
    const pageUsers = Array.isArray(response) ? response : response?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) {
      return users;
    }
  }
};

const restRows = async (resource) => {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const response = await fetch(`${baseUrl}/rest/v1/${resource}`, {
      headers: {
        ...authHeaders,
        "Range-Unit": "items",
        Range: `${start}-${start + pageSize - 1}`
      }
    });
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`REST API ${response.status}: ${responseText.slice(0, 300)}`);
    }
    const pageRows = responseText ? JSON.parse(responseText) : [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) {
      return rows;
    }
  }
};

const increment = (counts, id, amount = 1) => {
  if (id) {
    counts.set(id, (counts.get(id) ?? 0) + amount);
  }
};

const profileCompleteness = (profile) => {
  if (!profile) return 0;
  return [
    profile.display_name && profile.display_name !== "新用户" ? 20 : 0,
    profile.avatar_path ? 40 : 0,
    profile.phase ? 12 : 0,
    profile.country ? 8 : 0,
    profile.living_city ? 8 : 0,
    profile.hometown_country ? 8 : 0,
    profile.hometown_city ? 8 : 0,
    Math.min((profile.career_directions ?? []).length, 5) * 5,
    Math.min((profile.interests ?? []).length, 8) * 3
  ].reduce((total, value) => total + value, 0);
};

const activityScore = (id, state) =>
  profileCompleteness(state.profiles.get(id)) +
  (state.preferences.has(id) ? 15 : 0) +
  (state.friendships.get(id) ?? 0) * 15 +
  (state.shares.get(id) ?? 0) * 10 +
  (state.reactions.get(id) ?? 0) * 3 +
  (state.bookmarks.get(id) ?? 0) * 10 +
  Math.min(state.readEvents.get(id) ?? 0, 100) * 4 +
  (state.weeklyReports.get(id) ?? 0) * 8 +
  (state.personalizedIssues.get(id) ?? 0);

const readActivityState = async () => {
  const [profiles, preferences, friendships, shares, reactions, bookmarks, readEvents, weeklyReports, personalizedIssues] = await Promise.all([
    restRows("profiles?select=id,display_name,avatar_path,phase,career_directions,country,living_city,hometown_country,hometown_city,interests,created_at,updated_at"),
    restRows("content_preferences?select=user_id,topic_intensity,temporary_focus,push_plan"),
    restRows("friendships?select=user_a,user_b"),
    restRows("shares?select=author_id,target_user_id"),
    restRows("share_reactions?select=user_id"),
    restRows("bookmarks?select=user_id"),
    restRows("read_events?select=user_id"),
    restRows("weekly_reports?select=user_id"),
    restRows("personalized_daily_issues?select=user_id")
  ]);

  const state = {
    profiles: new Map(profiles.map((row) => [row.id, row])),
    preferences: new Set(preferences.map((row) => row.user_id)),
    friendships: new Map(),
    shares: new Map(),
    reactions: new Map(),
    bookmarks: new Map(),
    readEvents: new Map(),
    weeklyReports: new Map(),
    personalizedIssues: new Map()
  };
  friendships.forEach((row) => {
    increment(state.friendships, row.user_a);
    increment(state.friendships, row.user_b);
  });
  shares.forEach((row) => increment(state.shares, row.author_id));
  reactions.forEach((row) => increment(state.reactions, row.user_id));
  bookmarks.forEach((row) => increment(state.bookmarks, row.user_id));
  readEvents.forEach((row) => increment(state.readEvents, row.user_id));
  weeklyReports.forEach((row) => increment(state.weeklyReports, row.user_id));
  personalizedIssues.forEach((row) => increment(state.personalizedIssues, row.user_id));
  return state;
};

const updateAuthUser = async (userId, attributes) => authRequest(`admin/users/${userId}`, {
  method: "PUT",
  body: attributes
});

const verifyStableLogin = async (phone, expectedUserId) => {
  const result = await authRequest("token?grant_type=password", {
    method: "POST",
    body: {
      email: accountEmail(phone),
      password: accountPassword(phone)
    }
  });
  if (result?.user?.id !== expectedUserId || !result?.access_token) {
    throw new Error(`Stable login verification failed for account ${accountKey(phone)}`);
  }
};

async function main() {
  const [users, activity] = await Promise.all([listAuthUsers(), readActivityState()]);
  const groups = new Map();
  users.forEach((user) => {
    const phone = normalizedPhone(user.user_metadata?.test_phone);
    if (!/^\d{11}$/u.test(phone)) return;
    const group = groups.get(phone) ?? [];
    group.push(user);
    groups.set(phone, group);
  });

  const report = {
    dryRun,
    generatedAt: new Date().toISOString(),
    phoneGroupCount: groups.size,
    migratedAccountCount: 0,
    verifiedAccountCount: 0,
    duplicateAccountCount: 0,
    accounts: []
  };

  for (const [phone, candidates] of groups) {
    const ranked = [...candidates].sort((left, right) => {
      const scoreDifference = activityScore(right.id, activity) - activityScore(left.id, activity);
      if (scoreDifference !== 0) return scoreDifference;
      return String(left.created_at).localeCompare(String(right.created_at));
    });
    const canonical = ranked[0];
    const duplicates = ranked.slice(1);
    const desiredEmail = accountEmail(phone);
    const existingEmailOwner = users.find((user) => user.email?.toLowerCase() === desiredEmail.toLowerCase());

    if (existingEmailOwner && existingEmailOwner.id !== canonical.id && !candidates.some((item) => item.id === existingEmailOwner.id)) {
      throw new Error(`Credential collision for account ${accountKey(phone)}`);
    }

    if (!dryRun) {
      if (existingEmailOwner && existingEmailOwner.id !== canonical.id) {
        await updateAuthUser(existingEmailOwner.id, {
          email: `superseded-${existingEmailOwner.id}@accounts.shixiaobao.test`,
          email_confirm: true,
          user_metadata: {
            ...(existingEmailOwner.user_metadata ?? {}),
            test_phone: phone,
            test_auth_version: 2,
            superseded_by: canonical.id
          }
        });
      }

      await updateAuthUser(canonical.id, {
        email: desiredEmail,
        password: accountPassword(phone),
        email_confirm: true,
        user_metadata: {
          ...(canonical.user_metadata ?? {}),
          test_phone: phone,
          test_auth_version: 2
        }
      });

      for (const duplicate of duplicates.filter((item) => item.id !== existingEmailOwner?.id)) {
        await updateAuthUser(duplicate.id, {
          user_metadata: {
            ...(duplicate.user_metadata ?? {}),
            test_phone: phone,
            superseded_by: canonical.id
          }
        });
      }

      await verifyStableLogin(phone, canonical.id);
      report.verifiedAccountCount += 1;
    }

    report.migratedAccountCount += 1;
    report.duplicateAccountCount += duplicates.length;
    report.accounts.push({
      accountKey: accountKey(phone),
      candidateCount: candidates.length,
      selectedScore: activityScore(canonical.id, activity),
      duplicateCount: duplicates.length
    });
  }

  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(path.resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Migrated ${report.migratedAccountCount} stable test accounts; retained ${report.duplicateAccountCount} duplicate records.`);
  console.log(`Report: ${path.resolve(outputPath)}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
