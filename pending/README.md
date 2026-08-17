# Pending Daily Issues

Files in this folder are generated drafts for human review. The Android app does not read them.

Each date and edition can contain:

- `YYYY-MM-DD-<edition>.json`: public-safe candidate issue.
- `YYYY-MM-DD-<edition>.md`: readable review summary.
- `YYYY-MM-DD-<edition>.review.json`: machine-readable quality findings and candidate hash.

`<edition>` is `morning`, `midday`, or `evening`. A later edition must not silently overwrite an earlier pending draft.

Only the separate approval workflow can copy a non-blocked candidate to `latest.json` and `issues/`.
