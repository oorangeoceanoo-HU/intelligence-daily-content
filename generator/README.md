# Daily Content Generator Snapshot

This folder is compiled from the content-only modules in the private development workspace.

It is intentionally limited to:

- Public source fetching and normalization.
- Candidate deduplication and freshness checks.
- Card drafting and quality checks.
- Pending review summaries and approval validation.

It does not include the Android UI, Supabase configuration, user profiles, phone numbers, authentication data, or private environment files.

The snapshot is refreshed from the app workspace with `scripts/syncContentGenerator.ps1` after content-pipeline changes pass local verification.
