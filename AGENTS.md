# Working on the Inbox

A Shipyard plugin. `src/model.ts` holds the rules and is pure, `src/store.ts` talks to the boxes, the rest draws. It uses only `@berth/plugin`.

Before calling something done: `pnpm test && pnpm typecheck && pnpm build`, then the `verify-inbox` skill. Anything that changes what's sent to an agent needs its live scenario on both drivers.

- Public repo: fixtures stay synthetic ("acme"), and no company names, keys or real session titles go in.
- Use classes the app already has, or inline styles: a plugin's own Tailwind classes aren't generated.
- A key shortcut must never fire while a text field has focus.
- Every user-facing change updates `.claude/skills/verify-inbox/features/README.md` in the same commit.
- Commit messages are lowercase conventional, and the subject says what the user gets.

## Shipping

- **Deploy:** merge to main is the ship. There is no service and no CI deploy: `.github/workflows/ci.yml` only runs typecheck, test and build. A release is a separate step done by hand: `pnpm build`, then `tar -czf shipyard-inbox.tar.gz berth-plugin.json dist/index.js` and `gh release create vX.Y.Z shipyard-inbox.tar.gz`, the asset `install.sh` pulls from `releases/latest`. A release needs the owner's go unless the issue pre-approves it. Staging: none.
- **Runway:** R1 (local verify-inbox: Shipyard's app built from a ref, plugin loaded, Chromium on mock fixtures via app.sh drive inbox-mock; live scenario on an isolated dev box)
- **Watch a deploy:** none. CI on the merge commit: `gh run list --commit <sha>`, then `gh run watch <id>`.
- **Prod health:** no service to watch. The plugin runs inside each person's Shipyard app. After a release: the release asset exists and unpacks (`gh release view vX.Y.Z`, then `gh release download vX.Y.Z -p shipyard-inbox.tar.gz -O - | tar -tz`).
- **Rollback:** revert the PR. After a release: publish a new patch release from the reverted main. Installs don't change until someone re-runs `install.sh`, and Shipyard asks to allow the code again.
- **Side effects in prod:** none outside the user's own boxes. Answers go back to the session that asked.

### Access

| kind | name | project |
|---|---|---|
| gh | Stener1/shipyard-inbox | |
