#!/usr/bin/env bash
# [nocturne] Writes release notes to stdout and dist/release/SHA256SUMS.txt.
#
# Usage: bin/ci/release-notes.sh <version> <release-dir>
set -euo pipefail

version="$1"
dir="$2"

(
  cd "$dir"
  cat SHA256SUMS-*.txt | sort -k2 > SHA256SUMS.txt
)

previous_tag="$(git describe --tags --abbrev=0 "v${version}^" 2>/dev/null || true)"
# The fork point from upstream Hyper canary (see UPSTREAM.md).
fork_point="30ec0a2a91de17eeb32dd71998fe8a8ec59f98eb"
if [ -n "$previous_tag" ]; then
  range="${previous_tag}..v${version}"
else
  range="${fork_point}..v${version}"
fi

cat <<NOTES
Typewriter Nocturne ${version}: a literary terminal based on [Hyper](https://github.com/vercel/hyper).

Built entirely on GitHub Actions from commit \`${GITHUB_SHA}\`.

## Downloads

| Platform | File |
| --- | --- |
NOTES

for f in "$dir"/*; do
  name="$(basename "$f")"
  case "$name" in
    *mac-arm64.dmg) echo "| macOS · Apple silicon | \`${name}\` |" ;;
    *mac-x64.dmg) echo "| macOS · Intel | \`${name}\` |" ;;
    *win-x64-setup.exe) echo "| Windows · x64 | \`${name}\` |" ;;
    *.AppImage) echo "| Linux · AppImage | \`${name}\` |" ;;
    *.deb) echo "| Linux · Debian/Ubuntu | \`${name}\` |" ;;
  esac
done

cat <<NOTES

## These builds are not code-signed

- **macOS:** the app is ad-hoc signed only and not notarized, so Gatekeeper blocks the first launch.
  Open it once from *System Settings → Privacy & Security → Open Anyway*. Do not disable Gatekeeper.
- **Windows:** SmartScreen shows "Windows protected your PC" for unsigned installers.
  Choose *More info → Run anyway* only if the SHA-256 below matches.
- Signed and notarized builds need an Apple Developer ID and a Windows code-signing certificate
  configured as repository secrets (see \`docs/INSTALL.md\`).

## SHA-256

\`\`\`
$(cat "$dir/SHA256SUMS.txt")
\`\`\`

## Changes

$(git log --no-merges --pretty='- %s (%h)' "$range" | head -n 60)
NOTES
