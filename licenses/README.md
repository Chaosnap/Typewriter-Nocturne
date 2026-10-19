# Licences shipped with Typewriter Nocturne

This directory is copied into every installer (`resources/licenses/`).

| File | Covers |
| --- | --- |
| `LICENSE-Hyper.txt` | Hyper (MIT, © Vercel, Inc.), the terminal this application is built on |
| `../LICENSE` | Typewriter Nocturne itself (MIT) |
| `OFL-ibm-plex-mono.txt` | IBM Plex Mono (SIL OFL 1.1, © IBM Corp.) — terminal typeface |
| `OFL-courier-prime.txt` | Courier Prime (SIL OFL 1.1, © The Courier Prime Project Authors) — manuscript typeface |
| `OFL-eb-garamond.txt` | EB Garamond (SIL OFL 1.1, © The EB Garamond Project Authors) — interface serif |
| `OFL-cormorant-garamond.txt` | Cormorant Garamond (SIL OFL 1.1, © The Cormorant Project Authors) — display serif |

The fonts are bundled unmodified (WOFF2/WOFF subsets from the `@fontsource` packages) and are not
sold separately. Third-party npm dependencies keep their own licence
files inside the packaged `node_modules`, and CI fails on licences incompatible with MIT
distribution (`bin/ci/check-licenses.js`).
