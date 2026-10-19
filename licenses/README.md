# Licences shipped with Typewriter Nocturne

This directory is copied into every installer (`resources/licenses/`).

| File | Covers |
| --- | --- |
| `LICENSE-Hyper.txt` | Hyper (MIT, © Vercel, Inc.), the terminal this application is built on |
| `../LICENSE` | Typewriter Nocturne itself (MIT) |

Fonts bundled from Phase 3 onwards are licensed under the SIL Open Font License 1.1; their licence
text is added here together with the fonts. Third-party npm dependencies keep their own licence
files inside the packaged `node_modules`, and CI fails on licences incompatible with MIT
distribution (`bin/ci/check-licenses.js`).
