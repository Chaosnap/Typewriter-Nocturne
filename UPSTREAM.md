# Upstream: Hyper

Typewriter Nocturne is a fork of [vercel/hyper](https://github.com/vercel/hyper) (MIT).

| | |
| --- | --- |
| Upstream branch | `canary` |
| Fork point | `30ec0a2a91de17eeb32dd71998fe8a8ec59f98eb` (2026-08-21, "Delete .github/workflows/e2e_comment.yml (#8207)") |
| Upstream version at fork | `4.0.0-canary.5` (Electron 22.3.25, xterm.js 5.3.0, node-pty 1.0.0, pnpm 10.33) |
| Branch in this repo | `upstream-canary` (points at the fork point) |

## Where our changes live

* New code: `lib/nocturne/`, `app/nocturne/`, `assets/nocturne/`, `bin/ci/`, `docs/`, `test/unit/nocturne-*`.
* Edits to upstream files are marked with `[nocturne]` comments. To list the full patch surface:

  ```bash
  git diff upstream-canary -- app lib typings webpack.config.ts electron-builder.json
  ```

## Taking upstream fixes

```bash
git fetch upstream
git log --oneline upstream-canary..upstream/canary      # what is new upstream
git checkout -b merge/upstream-$(date +%Y%m%d)
git merge upstream/canary                                # resolve conflicts around [nocturne] markers
git push origin HEAD                                     # CI builds and tests everything in the cloud
```

After the merge lands on `main`, move `upstream-canary` to the merged upstream commit
(`git branch -f upstream-canary upstream/canary && git push origin upstream-canary`).

Upstream's own workflow (`nodejs.yml`) was removed because it no longer runs (it depends on the
retired `actions/upload-artifact@v3`). Our pipeline is in `.github/workflows/build.yml`.
