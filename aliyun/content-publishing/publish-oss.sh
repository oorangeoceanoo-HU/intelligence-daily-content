#!/usr/bin/env bash
set -euo pipefail

CONTENT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OSS_DESTINATION="${OSS_DESTINATION:?Set OSS_DESTINATION, for example oss://shixiaobao-content-cn-20260824/public}"
OSSUTIL_BIN="${OSSUTIL_BIN:-ossutil}"
PUBLIC_DIR="$(mktemp -d)"
trap 'rm -rf "$PUBLIC_DIR"' EXIT

command -v node >/dev/null || { echo "Node.js is required" >&2; exit 1; }
command -v "$OSSUTIL_BIN" >/dev/null 2>&1 || {
  echo "ossutil is required; install/configure it on the runner first" >&2
  exit 1
}

cd "$CONTENT_ROOT"
mkdir -p "$PUBLIC_DIR/issues" "$PUBLIC_DIR/editions" "$PUBLIC_DIR/personalization"
cp latest.json "$PUBLIC_DIR/latest.json"
cp issues/*.json "$PUBLIC_DIR/issues/"
cp -r editions/. "$PUBLIC_DIR/editions/"
cp personalization/latest.json "$PUBLIC_DIR/personalization/latest.json"
node generator/scripts/createIssueManifest.js \
  --issues-directory issues \
  --output "$PUBLIC_DIR/manifest.json"
printf '<!doctype html><meta charset="utf-8"><title>Shixiaobao content</title>\n' > "$PUBLIC_DIR/index.html"
touch "$PUBLIC_DIR/.nojekyll"

for required in latest.json manifest.json personalization/latest.json; do
  test -s "$PUBLIC_DIR/$required" || { echo "Missing public file: $required" >&2; exit 1; }
done

"$OSSUTIL_BIN" cp -r "$PUBLIC_DIR/" "$OSS_DESTINATION/" --update
echo "Published public content to $OSS_DESTINATION"
