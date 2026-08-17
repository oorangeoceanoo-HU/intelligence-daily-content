# Intelligence Daily Content

This repository contains the public daily issue JSON used by the Intelligence Daily Android preview.

- `latest.json` is the newest approved public edition. It may be the morning, midday, or evening edition for the current date.
- `issues/` contains dated issue archives.
- `editions/YYYY-MM-DD/` contains the approved edition history for that date.
- `pending/` contains generated drafts waiting for human approval. The app never reads this folder.
- `generator/` is a dependency-free snapshot of the public-content generator. It contains no app UI, account data, phone numbers, or backend credentials.

The repository does not contain the app source code, user accounts, phone numbers, or internal filtering diagnostics.

## Publishing flow

1. At 07:10, 12:10, and 21:10 Asia/Shanghai, `Prepare Daily Review` gathers current sources and creates a pending morning, midday, or evening draft. The drafts cover separate time windows rather than pretending one morning scrape is the whole day.
2. The generated Markdown summary lists the cards and highlights stale dates, truncated titles, possible title/lead mismatches, and repeated template copy.
3. A person reads the pending issue. Drafts with blocking findings cannot be published.
4. `Publish Approved Issue` requires the issue date, edition, and exact confirmation word `APPROVE` before replacing `latest.json`.
5. GitHub Pages deploys only `latest.json` and `issues/`; pending drafts and generator files are not part of the Pages site.
6. `manifest.json` lists the published archives so the App can open any available issue from the most recent seven days.
