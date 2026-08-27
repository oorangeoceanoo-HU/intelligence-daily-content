# Intelligence Daily Content

This repository contains the public daily issue JSON used by the Intelligence Daily Android preview.

- `latest.json` is the newest quality-approved public edition. It may be the morning, midday, or evening edition for the current date.
- `issues/` contains dated issue archives.
- `editions/YYYY-MM-DD/` contains the approved edition history for that date.
- `pending/` contains generated drafts and their quality reports. The app never reads this folder.
- `generator/` is a dependency-free snapshot of the public-content generator. It contains no app UI, account data, phone numbers, or backend credentials.

The repository does not contain the app source code, user accounts, phone numbers, or internal filtering diagnostics.

## Publishing flow

1. Before the 08:30, 12:30, and 21:30 Asia/Shanghai reading reminders, `Prepare Daily Review` gathers current sources and creates a morning, midday, or evening draft. The primary runs are scheduled at 08:00, 12:00, and 21:00, with a short retry after each slot. The drafts cover separate time windows rather than pretending one morning scrape is the whole day.
2. The generated Markdown summary records source health, traceability, freshness, card counts, possible content defects, and source concentration.
3. A hard quality gate blocks publication when the issue has fewer than 15 cards, lacks three pages, contains unverified content, or fails the content and source checks. The previous `latest.json` remains online in that case.
4. An edition with no blocking findings is published automatically. A person can still read the pending issue and its report, and the manual approval script remains available for a corrected draft.
5. GitHub Pages deploys only `latest.json`, `manifest.json`, `issues/`, and `editions/`; pending drafts and generator files are not part of the Pages site.
6. `manifest.json` lists the published archives. The App displays only the three dates immediately before the current China-time date.
