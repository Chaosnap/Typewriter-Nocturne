#!/usr/bin/env bash
# [nocturne] Render the vector source artwork into the raster files Electron and
# electron-builder need. Runs in CI (ubuntu, librsvg) so no image tooling is
# required on a contributor machine. All sources live in assets/nocturne/.
set -euo pipefail

command -v rsvg-convert >/dev/null || {
  echo "rsvg-convert not found (apt-get install librsvg2-bin)" >&2
  exit 1
}

root="$(cd "$(dirname "$0")/../.." && pwd)"
src="$root/assets/nocturne"

mkdir -p "$root/app/static" "$root/build"

# App icon: electron-builder derives .icns/.ico from a 1024px PNG.
rsvg-convert -w 1024 -h 1024 "$src/icon.svg" -o "$root/build/icon.png"
# Window / About dialog icons used at runtime by the main process.
rsvg-convert -w 512 -h 512 "$src/icon.svg" -o "$root/app/static/icon.png"
rsvg-convert -w 96 -h 96 "$src/icon.svg" -o "$root/app/static/icon96x96.png"

# Theme thumbnails for documentation and the release page.
mkdir -p "$root/dist/assets"
for theme in paper-and-ink midnight-study moonlit-poetry; do
  rsvg-convert -w 960 "$src/thumbnails/${theme}.svg" -o "$root/dist/assets/thumbnail-${theme}.png"
done

ls -la "$root/build/icon.png" "$root/app/static" "$root/dist/assets"
