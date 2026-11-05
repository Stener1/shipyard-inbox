# Inbox for Shipyard

One inbox across all your [Shipyard](https://github.com/cosscom/shipyard) agents. It shows what needs you, grouped by what it needs, and your answer goes straight back to the session that asked.

- **Four groups:** needs my decision, needs an action from me, ready to review or merge, blocked or crashed.
- **Question cards:** options with the recommended one marked, a note, Snooze, and Resolve without answering, which tells the agent so it stops waiting.
- **Walk-through:** press `w` to go through items one at a time.
- **Peek:** press `p` to read the session beside the card, without losing your answer.
- **Keyboard first:** `1`–`9` pick, `↵` sends, `j`/`k` move, `h` snoozes, `x` resolves, `n` writes a note, `o` opens the session. No shortcut fires while you're typing, so dictation tools work in the note.

It needs nothing from your agents. It reads the signals Shipyard already has: question forms, permission prompts, run gates and exits. Nothing is sent anywhere but your own boxes.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/Stener1/shipyard-inbox/main/install.sh | bash
```

Then **Settings → Plugins → Reload** in Shipyard and turn on Inbox. Shipyard asks you to allow the code, and asks again after each update. To keep it at hand, pin it from **More → Customize sidebar**.

## Limits for now

- Snooze and Resolve marks stay on the computer you made them on.
- "Ready to review or merge" fills once agents can post to the Inbox, which needs a change in Shipyard.
- Resume works for a box's chat sessions, which keep a conversation record.
- Sessions sort into decision and action on a Shipyard with sub-states of Needs you. Without them, every waiting session is a decision.

## Develop

```sh
pnpm install
pnpm test && pnpm typecheck && pnpm build
```

To prove a change in the real app, follow [verify-inbox](.claude/skills/verify-inbox/SKILL.md). Fixtures stay synthetic ("acme"), and nothing company-specific goes in this repo.

## License

MIT
