# Pending Daily Issues

Files in this folder are generated drafts for human review. The Android app does not read them.

Each date can contain:

- `YYYY-MM-DD.json`: public-safe candidate issue.
- `YYYY-MM-DD.md`: readable review summary.
- `YYYY-MM-DD.review.json`: machine-readable quality findings and candidate hash.

Only the separate approval workflow can copy a non-blocked candidate to `latest.json` and `issues/`.
