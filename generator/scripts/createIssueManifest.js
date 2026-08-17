"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeRequire = typeof require === "function" ? require : undefined;
const parseArgs = (argv) => {
    const values = new Map();
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg.startsWith("--") && argv[index + 1]) {
            values.set(arg.slice(2), argv[index + 1]);
            index += 1;
        }
    }
    return {
        issuesDirectory: values.get("issues-directory") ?? "issues",
        output: values.get("output") ?? "manifest.json"
    };
};
async function main() {
    if (!nodeRequire) {
        throw new Error("Node runtime is required");
    }
    const fs = nodeRequire("node:fs/promises");
    const path = nodeRequire("node:path");
    const options = parseArgs(process.argv.slice(2));
    const names = await fs.readdir(options.issuesDirectory);
    const entries = [];
    for (const name of names) {
        if (!/^\d{4}-\d{2}-\d{2}\.json$/u.test(name)) {
            continue;
        }
        const filePath = path.join(options.issuesDirectory, name);
        const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
        const issue = payload.issue;
        if (!issue || issue.date !== name.slice(0, 10) || !issue.cards.length) {
            continue;
        }
        entries.push({
            date: issue.date,
            url: `issues/${name}`,
            cardCount: issue.cards.length,
            estimatedReadMinutes: issue.estimatedReadMinutes,
            publishedAt: payload.publishedAt ?? issue.generatedAt
        });
    }
    entries.sort((left, right) => right.date.localeCompare(left.date));
    const manifest = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        issues: entries
    };
    await fs.mkdir(path.dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Issue manifest created: ${entries.length} archived issues.`);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
