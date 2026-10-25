#!/usr/bin/env bash
# [nocturne] Fetches bundled fonts that are not published on npm.
#
# Each file is pinned to a release tag of its upstream repository and verified by its git object
# hash (the hash GitHub shows for that file at that tag), so a changed or truncated download fails
# the build instead of shipping. Nothing is fetched on users' machines.
set -euo pipefail

dir="assets/fonts"
mkdir -p "$dir"

fetch() {
  local url="$1" target="$2" expected="$3" actual
  if [ -f "$target" ] && [ "$(git hash-object --no-filters "$target")" = "$expected" ]; then
    echo "$target is up to date"
    return
  fi
  curl -fsSL --retry 3 --retry-delay 2 -o "$target.download" "$url"
  actual="$(git hash-object --no-filters "$target.download")"
  if [ "$actual" != "$expected" ]; then
    rm -f "$target.download"
    echo "::error title=Font hash mismatch::$target: got $actual, expected $expected"
    exit 1
  fi
  mv "$target.download" "$target"
  echo "fetched $target ($(wc -c < "$target") bytes)"
}

# Symbols Nerd Font Mono 3.2.1 (MIT, see licenses/MIT-nerd-fonts.txt): the icon glyphs of Nerd
# Fonts, used as a fallback after every terminal face.
fetch \
  "https://raw.githubusercontent.com/ryanoasis/nerd-fonts/v3.2.1/patched-fonts/NerdFontsSymbolsOnly/SymbolsNerdFontMono-Regular.ttf" \
  "$dir/SymbolsNerdFontMono-Regular.ttf" \
  534d52a4f5642b08a601b484ce1c64c052aa3449
