# Feature map

| Feature | What a person does | Proof |
|---|---|---|
| The list | Opens Inbox, sees four groups, oldest first, with a count equal to the list | `inbox-mock` |
| Moving around | `j`/`k`, click a row. A new item never replaces the card you're on | `inbox-mock`; rule in `model.test.ts` |
| Walk-through | `w`: one card at a time, "N left, about M min", "1 of N" | `inbox-mock` |
| Answering a form | Number keys pick, recommended is marked, Enter sends. Reaches the agent | `inbox-mock` (payload), `inbox-live` (both drivers) |
| A pick with a note | Note goes with the pick as one line, double quotes survive | `inbox-live` (both drivers) |
| Permission prompts | Allow, Always allow, Deny, by key or click. The command runs | `inbox-live` (both drivers) |
| Resolve without answering | Few seconds to undo, then the agent is told and carries on | `inbox-mock` (undo), `inbox-live` (form and permission, both drivers) |
| Snooze | `h` then 1/2/3. Leaves the count, shows "N snoozed", returns when due | `inbox-mock`; return in `model.test.ts` |
| Peek | `p`: the session beside the card, following along. The draft stays | `inbox-mock`, `inbox-live` |
| Drafts | Walking away and back keeps what you wrote | `inbox-mock` |
| Typing is safe | No shortcut fires in the note, so a dictation tool can type there | `inbox-mock` |
| Agents on their own screen | Trust prompt and similar: shows the screen, offers Open session, no reply box | By hand on a fresh dev box. No scenario yet |
| Run gates | Approve or Reject on the card | Shown in `inbox-mock`. Deciding isn't driven yet |
| Secret requests | Listed as an action, filled in the session | `model.test.ts`. Not driven yet |
| Crashed or exited sessions | Blocked group, Resume | `model.test.ts`. Resume isn't driven yet |
