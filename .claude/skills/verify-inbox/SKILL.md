---
name: verify-inbox
description: Prove a change to the Shipyard Inbox plugin works the way a person sees it. Serve Shipyard's real app in a throwaway worktree, load this plugin into it, drive the Inbox in a real Chromium on mock fixtures, and answer real Claude Code on an isolated dev box. Use before calling any Inbox change done.
---

# Verify the Inbox

The Inbox is a plugin, so it only means something inside the Shipyard app. This skill builds Shipyard's app from a ref you choose, loads `dist/index.js` beside its built-in plugins, and drives it with Shipyard's own harness (`verify-berthd`'s `drive.mjs`).

## Launch

```sh
.claude/skills/verify-inbox/scripts/app.sh up     # builds the plugin, and the app in /tmp/inbox-app; serves it on :1433
```

Env: `SHIPYARD_REPO` (a clone of Shipyard, default `~/work/berthd`), `SHIPYARD_REF` (default `fork/stener`, a build with the sub-states of Needs you), `INBOX_PORT` (1421-1439, default 1433). It refuses a port that's taken. Never use 1420 or 1377-1379. Ready when `up` prints `ready`.

## Doctor

```sh
.claude/skills/verify-inbox/scripts/app.sh doctor
```

Read only: says whether the port answers, that the listener is the one this skill started, and that the plugin's `dist/` is newer than `src/`.

## Drive

Mock fixtures, synthetic `acme` data, about a minute:

```sh
.claude/skills/verify-inbox/scripts/app.sh drive inbox-mock
```

Real Claude Code on a dev box, once per driver. It costs a few real turns on the signed-in account:

```sh
.claude/skills/verify-inbox/scripts/app.sh box-up
VERIFY_INBOX_DRIVER=terminal .claude/skills/verify-inbox/scripts/app.sh drive-live inbox-live
VERIFY_INBOX_DRIVER=claude   .claude/skills/verify-inbox/scripts/app.sh drive-live inbox-live
```

`box-up` starts its own box and agent on 7544/9377/9378 under `/tmp/vb-inbox`. **Check those ports aren't someone else's first**: `box-up` refuses if they answer. On a fresh folder Claude stops at its trust prompt, and `box-up` accepts it once, so the first live run doesn't hang.

Which scenario proves which feature is in [features/README.md](features/README.md). Stable hooks are the `inbox-*` test ids.

## Evidence

`/tmp/inbox-ev/<scenario>-<time>/`: screenshots, ARIA snapshots, `console.txt`, `result.json`. A scenario fails on a page error or console error.

Proof standards:

- Drive what a person does: click the row, press the key.
- Read the effect from a second view. An answer counts when the **agent's own transcript** says it back, not when the card leaves.
- Live screenshots of the real fleet show real work, so keep them private. Dev box and mock ones are synthetic.
- Answers run through `answerFor`. Any change there needs both drivers, because a box refuses a single choice with a pick and words, and a straight double quote cuts answers short on the chat driver.

## Cleanup

```sh
.claude/skills/verify-inbox/scripts/app.sh box-down   # the dev box, if you started one
.claude/skills/verify-inbox/scripts/app.sh down       # the preview and the app worktree
```

Both only touch what this skill started. Evidence stays.

## Keep it current

Every change that adds or changes a user-facing feature updates [features/README.md](features/README.md) and its scenario in the same commit.
