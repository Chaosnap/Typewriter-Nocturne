#!/usr/bin/env bash
# [nocturne] Gather installers from dist/ into dist/release/ with SHA-256 checksums and
# a machine-readable build record (version, commit, runner, signing state).
#
# Usage: bin/ci/collect-artifacts.sh <platform-slug> <version>
set -euo pipefail

slug="$1"
version="$2"
out="dist/release"
mkdir -p "$out"

shopt -s nullglob
installers=(dist/*.dmg dist/*.exe dist/*.AppImage dist/*.deb)
if [ "${#installers[@]}" -eq 0 ]; then
  echo "No installers found in dist/" >&2
  ls -la dist >&2 || true
  exit 1
fi
cp "${installers[@]}" "$out/"

sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi
}

(
  cd "$out"
  files=()
  for f in *; do
    case "$f" in SHA256SUMS* | BUILD-INFO*) ;; *) files+=("$f") ;; esac
  done
  sha256 "${files[@]}" > "SHA256SUMS-${slug}.txt"
  cat "SHA256SUMS-${slug}.txt"
)

signed=false
if [ -n "${CSC_LINK:-}" ] || [ -n "${WIN_CSC_LINK:-}" ]; then signed=true; fi

electron_version="$(node -p "require('./node_modules/electron/package.json').version")"
cat > "$out/BUILD-INFO-${slug}.json" <<JSON
{
  "product": "Typewriter Nocturne",
  "version": "${version}",
  "platform": "${slug}",
  "commit": "${GITHUB_SHA:-unknown}",
  "ref": "${GITHUB_REF:-unknown}",
  "run": "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-unknown}/actions/runs/${GITHUB_RUN_ID:-0}",
  "runner": "${RUNNER_OS:-unknown}-${RUNNER_ARCH:-unknown}",
  "electron": "${electron_version}",
  "node": "$(node -v)",
  "codeSigned": ${signed},
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
cat "$out/BUILD-INFO-${slug}.json"

{
  echo "### ${slug} · ${version}"
  echo ""
  echo "| File | Size |"
  echo "| --- | ---: |"
  for f in "$out"/*; do
    echo "| $(basename "$f") | $(du -h "$f" | cut -f1) |"
  done
  echo ""
  echo "Commit \`${GITHUB_SHA:-unknown}\` · code signed: ${signed}"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
