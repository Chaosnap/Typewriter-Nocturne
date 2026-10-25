# Built in the cloud

Every dependency install, native module rebuild, test and installer is produced by GitHub Actions; nothing is
built on a developer's machine.

```text
change code → push → CI (lint · types · unit tests · licences · packages · e2e on a real PTY) → fix → push
```

Each push to `main` runs:

- **Validate**: ESLint with Prettier, TypeScript, the unit tests (physics, light model, contrast of every paper,
  settings validation, folios, key classification) and a licence check of every production dependency,
- **Package** on macOS, Windows and Linux: the installers, then an end-to-end test of the packaged app that
  types into a real shell through the real PTY, checks output, exit codes, CJK text, paste, an input-method
  composition, resizing, the lamp cord and the Press, and takes the screenshots shown in this documentation.

A version tag publishes a [release](https://github.com/Chaosnap/Typewriter-Nocturne/releases) with checksums.
This site is built with VitePress and published to GitHub Pages by the same pipeline.

Typewriter Nocturne is a fork of [Hyper](https://github.com/vercel/hyper) and stays close to it; see
[ARCHITECTURE.md](https://github.com/Chaosnap/Typewriter-Nocturne/blob/main/docs/ARCHITECTURE.md) for the design
and [UPSTREAM.md](https://github.com/Chaosnap/Typewriter-Nocturne/blob/main/UPSTREAM.md) for how upstream changes
are merged.
