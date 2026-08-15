"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeRequire = typeof require === "function" ? require : undefined;
function parseArgs(argv) {
    const values = new Map();
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg.startsWith("--") && argv[index + 1]) {
            values.set(arg.slice(2), argv[index + 1]);
            index += 1;
        }
    }
    const date = values.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
        throw new Error("--date must use YYYY-MM-DD");
    }
    return {
        date,
        confirmation: values.get("confirmation") ?? "",
        pendingDirectory: values.get("pending-directory") ?? "pending",
        outputDirectory: values.get("output-directory") ?? "."
    };
}
const sha256 = (value) => {
    if (!nodeRequire) {
        throw new Error("Node runtime is required");
    }
    return nodeRequire("node:crypto").createHash("sha256").update(value, "utf8").digest("hex");
};
async function main() {
    if (!nodeRequire) {
        throw new Error("Node runtime is required");
    }
    const options = parseArgs(process.argv.slice(2));
    if (options.confirmation !== "APPROVE") {
        throw new Error("Publishing requires --confirmation APPROVE");
    }
    const fs = nodeRequire("node:fs/promises");
    const path = nodeRequire("node:path");
    const pendingPath = path.join(options.pendingDirectory, `${options.date}.json`);
    const reportPath = path.join(options.pendingDirectory, `${options.date}.review.json`);
    const latestPath = path.join(options.outputDirectory, "latest.json");
    const archivePath = path.join(options.outputDirectory, "issues", `${options.date}.json`);
    const candidateText = await fs.readFile(pendingPath, "utf8");
    const candidate = JSON.parse(candidateText);
    const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
    if (report.date !== options.date || candidate.issue.date !== options.date) {
        throw new Error("Pending issue date does not match the approval date");
    }
    if (report.status === "blocked") {
        throw new Error("Pending issue still has blocking findings and cannot be published");
    }
    if (sha256(candidateText) !== report.candidateSha256) {
        throw new Error("Pending issue changed after review; regenerate its review summary first");
    }
    if (candidate.issue.cards.length < 15 || candidate.issue.cards.length > 30) {
        throw new Error("Pending issue card count is outside the 15 to 30 publishing range");
    }
    try {
        const latest = JSON.parse(await fs.readFile(latestPath, "utf8"));
        if (latest.issue.date > options.date) {
            throw new Error("Refusing to replace a newer online issue with an older one");
        }
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    await fs.writeFile(latestPath, candidateText, "utf8");
    await fs.writeFile(archivePath, candidateText, "utf8");
    console.log(`Approved ${options.date}: ${candidate.issue.cards.length} cards are ready for publishing.`);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
