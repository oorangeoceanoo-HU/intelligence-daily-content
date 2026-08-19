"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const personalizedIssue_1 = require("../src/content/personalizedIssue");
const nodeRequire = typeof require === "function" ? require : undefined;
if (!nodeRequire) {
    throw new Error("This script requires Node.js");
}
const fs = nodeRequire("node:fs/promises");
const path = nodeRequire("node:path");
const contentFeedbackKey = "__card_feedback__";
const splitTopicPreferences = (value) => {
    const raw = value ?? {};
    const contentFeedback = raw[contentFeedbackKey] && typeof raw[contentFeedbackKey] === "object"
        ? raw[contentFeedbackKey]
        : {};
    const topicIntensity = Object.fromEntries(Object.entries(raw).filter(([key, entry]) => key !== contentFeedbackKey && typeof entry === "string"));
    return { topicIntensity, contentFeedback };
};
const editionOrder = {
    morning: 0,
    midday: 1,
    evening: 2
};
const parseArgs = (argv) => {
    const values = new Map();
    const flags = new Set();
    argv.forEach((arg, index) => {
        if (!arg.startsWith("--")) {
            return;
        }
        const name = arg.slice(2);
        const next = argv[index + 1];
        if (!next || next.startsWith("--")) {
            flags.add(name);
        }
        else {
            values.set(name, next);
        }
    });
    return {
        input: values.get("input") ?? "tmp/review.json",
        output: values.get("output") ?? "tmp/personalized-issues-report.json",
        profilesFile: values.get("profiles-file"),
        dryRun: flags.has("dry-run"),
        skipWhenUnconfigured: flags.has("skip-when-unconfigured")
    };
};
const requireString = (value, name) => {
    const normalized = value?.trim();
    if (!normalized) {
        throw new Error(`${name} is required`);
    }
    return normalized;
};
const normalizeSupabaseUrl = (value) => value.replace(/\/rest\/v1\/?$/u, "").replace(/\/$/u, "");
const supabaseRequest = async (params) => {
    const response = await fetch(`${params.baseUrl}/rest/v1/${params.resource}`, {
        method: params.method ?? "GET",
        headers: {
            apikey: params.serviceRoleKey,
            Authorization: `Bearer ${params.serviceRoleKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(params.prefer ? { Prefer: params.prefer } : {})
        },
        body: params.body === undefined ? undefined : JSON.stringify(params.body)
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Supabase ${response.status}: ${text.slice(0, 300)}`);
    }
    return (text ? JSON.parse(text) : undefined);
};
const toUserProfile = (row) => ({
    phone: row.id,
    displayName: row.display_name,
    phase: row.phase,
    careerDirections: row.career_directions ?? [],
    country: row.country,
    livingCity: row.living_city,
    hometownCountry: row.hometown_country || row.country,
    hometownCity: row.hometown_city,
    interests: row.interests ?? []
});
const isConfiguredProfile = (profile) => Boolean(profile.country &&
    profile.livingCity &&
    profile.hometownCountry &&
    profile.hometownCity &&
    (profile.careerDirections.length || profile.interests.length));
const readFixtureProfiles = async (filePath) => {
    const value = JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
    if (!Array.isArray(value)) {
        throw new Error("Profiles fixture must be an array");
    }
    return {
        profiles: value,
        preferences: value.map((item) => ({
            user_id: item.id,
            topic_intensity: item.topic_intensity ?? {},
            temporary_focus: item.temporary_focus ?? [],
            push_plan: item.push_plan ?? "morning_noon_evening"
        })),
        existingIssues: []
    };
};
const fetchCohort = async (baseUrl, serviceRoleKey, date) => {
    const [profiles, preferences, existingIssues] = await Promise.all([
        supabaseRequest({
            baseUrl,
            serviceRoleKey,
            resource: "profiles?select=id,display_name,phase,career_directions,country,living_city,hometown_country,hometown_city,interests&order=created_at.asc"
        }),
        supabaseRequest({
            baseUrl,
            serviceRoleKey,
            resource: "content_preferences?select=user_id,topic_intensity,temporary_focus,push_plan"
        }),
        supabaseRequest({
            baseUrl,
            serviceRoleKey,
            resource: `personalized_daily_issues?select=user_id,edition,payload,generated_at&issue_date=eq.${encodeURIComponent(date)}&order=generated_at.desc`
        })
    ]);
    return { profiles, preferences, existingIssues };
};
const baseIssueFor = (existingIssues, userId, edition) => existingIssues
    .filter((row) => row.user_id === userId &&
    editionOrder[row.edition] < editionOrder[edition] &&
    Boolean(row.payload?.issue))
    .sort((left, right) => editionOrder[right.edition] - editionOrder[left.edition])[0]
    ?.payload.issue;
async function main() {
    const options = parseArgs(process.argv.slice(2));
    const input = JSON.parse(await fs.readFile(path.resolve(options.input), "utf8"));
    if (!input.issue?.date || !input.meta?.edition || !Array.isArray(input.personalizationPool)) {
        throw new Error("The diagnostic input does not contain a personalization pool");
    }
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!options.profilesFile && (!supabaseUrl || !serviceRoleKey)) {
        if (options.skipWhenUnconfigured) {
            console.log("Personalized issue publishing skipped because Supabase server credentials are not configured.");
            return;
        }
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }
    const cohort = options.profilesFile
        ? await readFixtureProfiles(options.profilesFile)
        : await fetchCohort(normalizeSupabaseUrl(requireString(supabaseUrl, "SUPABASE_URL")), requireString(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"), input.issue.date);
    const preferencesByUser = new Map(cohort.preferences.map((item) => [item.user_id, item]));
    const generatedAt = input.meta.generatedAt ?? new Date().toISOString();
    const personalizedRows = cohort.profiles
        .map((row) => ({ row, profile: toUserProfile(row) }))
        .filter(({ profile }) => isConfiguredProfile(profile))
        .map(({ row, profile }) => {
        const preferences = preferencesByUser.get(row.id);
        const result = (0, personalizedIssue_1.buildPersonalizedDailyIssue)({
            userId: row.id,
            profile,
            preferences: {
                topicIntensity: splitTopicPreferences(preferences?.topic_intensity).topicIntensity,
                temporaryFocus: preferences?.temporary_focus ?? [],
                pushPlan: preferences?.push_plan,
                contentFeedback: splitTopicPreferences(preferences?.topic_intensity).contentFeedback
            },
            pool: input.personalizationPool,
            date: input.issue.date,
            edition: input.meta.edition,
            editionLabel: input.issue.editionLabel ?? input.meta.edition,
            coverageWindow: input.issue.coverageWindow,
            generatedAt,
            baseIssue: baseIssueFor(cohort.existingIssues, row.id, input.meta.edition)
        });
        const databaseRow = {
            user_id: row.id,
            issue_date: input.issue.date,
            edition: input.meta.edition,
            payload: {
                publishedAt: generatedAt,
                issue: result.issue
            },
            profile_key: result.summary.profileKey,
            personalization_summary: result.summary,
            source_generated_at: input.issue.generatedAt,
            generated_at: generatedAt
        };
        return {
            databaseRow,
            complete: (0, personalizedIssue_1.isCompletePersonalizedIssue)(result.issue)
        };
    })
        .filter((entry) => entry.databaseRow.payload.issue.cards.length > 0);
    const generatedRows = personalizedRows
        .filter((entry) => entry.complete)
        .map((entry) => entry.databaseRow);
    const deferredRows = personalizedRows
        .filter((entry) => !entry.complete)
        .map((entry) => entry.databaseRow);
    if (!options.dryRun && !options.profilesFile && generatedRows.length) {
        await supabaseRequest({
            baseUrl: normalizeSupabaseUrl(requireString(supabaseUrl, "SUPABASE_URL")),
            serviceRoleKey: requireString(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
            resource: "personalized_daily_issues?on_conflict=user_id,issue_date,edition",
            method: "POST",
            prefer: "resolution=merge-duplicates,return=minimal",
            body: generatedRows
        });
    }
    const report = {
        date: input.issue.date,
        edition: input.meta.edition,
        generatedAt,
        profileCount: cohort.profiles.length,
        configuredProfileCount: cohort.profiles.filter((row) => isConfiguredProfile(toUserProfile(row))).length,
        publishedProfileCount: generatedRows.length,
        deferredProfileCount: deferredRows.length,
        dryRun: options.dryRun || Boolean(options.profilesFile),
        issues: generatedRows.map((row) => ({
            userId: row.user_id,
            cardCount: row.payload.issue.cards.length,
            topCardId: row.payload.issue.topCardId,
            cardIds: row.payload.issue.cards.map((card) => card.id),
            profileKey: row.profile_key,
            layerCounts: row.personalization_summary.layerCounts,
            fallbackCardCount: row.personalization_summary.fallbackCardCount
        })),
        deferredIssues: deferredRows.map((row) => ({
            userId: row.user_id,
            cardCount: row.payload.issue.cards.length,
            reason: "below-complete-issue-minimum"
        }))
    };
    await fs.mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
    await fs.writeFile(path.resolve(options.output), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Generated ${generatedRows.length} personalized issues for ${input.issue.date} ${input.meta.edition}.`);
    if (deferredRows.length) {
        console.log(`Deferred ${deferredRows.length} incomplete personalized issues; those users keep the public fallback.`);
    }
    console.log(`Report: ${path.resolve(options.output)}`);
}
void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
