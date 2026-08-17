# Intelligence Daily Content

This repository contains the public daily issue JSON used by the Intelligence Daily Android preview.

- `latest.json` is the newest public issue.
- `issues/` contains dated issue archives.
- `pending/` contains generated drafts waiting for human approval. The app never reads this folder.
- `generator/` is a dependency-free snapshot of the public-content generator. It contains no app UI, account data, phone numbers, or backend credentials.

The repository does not contain the app source code, user accounts, phone numbers, or internal filtering diagnostics.

## Publishing flow

1. At 10:00 Asia/Shanghai, `Prepare Daily Review` gathers current sources and creates a pending draft. This timing allows the main Chinese sources to complete their morning updates.
2. The generated Markdown summary lists the cards and highlights stale dates, truncated titles, possible title/lead mismatches, and repeated template copy.
3. A person reads the pending issue. Drafts with blocking findings cannot be published.
4. `Publish Approved Issue` requires the issue date and the exact confirmation word `APPROVE` before replacing `latest.json`.
5. GitHub Pages deploys only `latest.json` and `issues/`; pending drafts and generator files are not part of the Pages site.
6. `manifest.json` lists the published archives so the App can open any available issue from the most recent seven days.
