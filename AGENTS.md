# Working on the Inbox

A Shipyard plugin. `src/model.ts` holds the rules and is pure, `src/store.ts` talks to the boxes, the rest draws. It uses only `@berth/plugin`.

Before calling something done: `pnpm test && pnpm typecheck && pnpm build`, then the `verify-inbox` skill. Anything that changes what's sent to an agent needs its live scenario on both drivers.

- Public repo: fixtures stay synthetic ("acme"), and no company names, keys or real session titles go in.
- Use classes the app already has, or inline styles: a plugin's own Tailwind classes aren't generated.
- A key shortcut must never fire while a text field has focus.
- Every user-facing change updates `.claude/skills/verify-inbox/features/README.md` in the same commit.
- Commit messages are lowercase conventional, and the subject says what the user gets.
