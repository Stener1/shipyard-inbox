// inbox-mock: the Inbox on Shipyard's mock fixtures (?mock=1, synthetic "acme"
// data) in a real browser: the sidebar count equals the list, the groups show,
// the walk-through steps one item at a time, a form is answered by keys, and the
// peek shows the session beside the card without losing a draft note.
import { readFileSync } from "node:fs";

const dist = new URL("../../../../../dist/index.js", import.meta.url);

// The mock box has no transcripts for a plugin's own requests, so this wraps the
// plugin's berth.api.request with synthetic ones and keeps what it's asked to send
// on window.__inboxSent. Real agents are inbox-live.mjs.
const stub = `
const FORM = [
  { kind: "user", id: "u1", text: "Plan the release of the checkout fix." },
  { kind: "tools", id: "t1", verb: "Read webhook.ts" },
  { kind: "text", id: "x1", text: "I read the **webhook** code. Two choices left." },
  { kind: "question", id: "q1", tool: "mock-tool", questions: [
    { question: "Which day should acme release?", options: [{ label: "Tuesday (Recommended)", description: "Quiet traffic." }, { label: "Friday", description: "Before the weekend." }] },
    { question: "Who should watch it?", options: [{ label: "On-call" }, { label: "Author" }] },
  ] },
];
const wrap = (plugin) => (berth) => {
  window.__inboxSent = [];
  const api = Object.create(berth.api);
  api.request = (box, method, path, body) => {
    if (method === "GET" && path === "sessions/shop-claude/transcript") return Promise.resolve({ source: "mock", items: FORM });
    if (method === "GET" && path.endsWith("/transcript")) return Promise.resolve({ source: "mock", items: [{ kind: "text", id: "m", text: "Should acme keep the old flag?" }] });
    if (method === "POST" && path.endsWith("/answer")) { window.__inboxSent.push({ path, body }); return Promise.resolve({ answered: [] }); }
    return berth.api.request(box, method, path, body);
  };
  const ctx = new Proxy(berth, { get: (t, k) => (k === "api" ? api : t[k]) });
  return plugin(ctx);
};
`;
const source = readFileSync(dist, "utf8").replace(/export \{\s*(\w+) as default\s*\};?/, (_, name) => `${stub}\nexport default wrap(${name});`);
if (!source.includes("export default wrap")) throw new Error("can't find the plugin's default export in dist/index.js");

export const plugins = [{ id: "inbox", name: "Inbox", source }];
export const params = { labs: "0", sidebar: "list", structured: "1" };

export async function run({ page, shot, step, expect }) {
  step("open the Inbox from More");
  await page.getByTestId("nav-more").click();
  await page.getByRole("menu").getByRole("menuitem", { name: /^Inbox/ }).click();
  const screen = page.getByTestId("inbox-screen");
  await expect(screen).toBeVisible();
  const left = page.getByTestId("inbox-left");
  await expect(left).toContainText(" left");
  await shot("1-list");

  step("the count is the length of the list");
  const n = Number((await left.innerText()).split(" ")[0]);
  await expect(page.getByTestId("inbox-item")).toHaveCount(n);
  if (n < 2) throw new Error(`the fixtures should leave at least 2 items, got ${n}`);
  console.log("items:", await page.getByTestId("inbox-item").allInnerTexts());

  step("j moves to the next card, k back");
  const title = page.getByTestId("inbox-card-title");
  const current = page.locator('[data-testid=inbox-item][aria-current]');
  const first = await current.textContent();
  await page.keyboard.press("j");
  await expect(current).not.toHaveText(first);
  await page.keyboard.press("k");
  await expect(current).toHaveText(first);

  step("walk-through hides the list and says where you are");
  await page.keyboard.press("w");
  await expect(page.getByTestId("inbox-list")).toBeHidden();
  await expect(page.getByTestId("inbox-position")).toHaveText(`1 of ${n}`);
  await shot("2-walk");
  await page.keyboard.press("w");
  await expect(page.getByTestId("inbox-list")).toBeVisible();

  step("snooze takes a card off, and the count follows");
  await page.keyboard.press("h");
  await expect(page.getByTestId("inbox-snooze")).toBeVisible();
  await shot("3-snooze");
  await page.keyboard.press("1");
  await expect(left).toContainText(`${n - 1} left`);
  await expect(page.getByTestId("inbox-item")).toHaveCount(n - 1);
  await expect(page.getByTestId("inbox-snoozed-count")).toHaveText("1 snoozed");

  step("a session's form shows on its card, with its options and number keys");
  await page.getByTestId("inbox-item").filter({ hasText: "Plan the checkout release" }).click();
  await expect(title).toHaveText("Plan the checkout release");
  const questions = page.getByTestId("inbox-question");
  await expect(questions.first()).toBeVisible({ timeout: 15_000 });
  const asked = await questions.count();
  await expect(page.getByTestId("inbox-recommended")).toHaveText("Recommended");
  await expect(page.getByTestId("inbox-option").first()).toContainText("Tuesday");
  await expect(page.getByTestId("inbox-option").first()).not.toContainText("(Recommended)");
  await shot("4-form");

  step("typing a note presses nothing");
  const note = page.getByTestId("inbox-note");
  await note.click();
  await page.keyboard.type("hjkwpx 12");
  await expect(note).toHaveValue("hjkwpx 12");
  await expect(title).toHaveText("Plan the checkout release");
  await page.keyboard.press("Escape");

  step("the peek opens beside the card, with the session's own words, and the draft stays");
  await page.keyboard.press("p");
  const peek = page.getByTestId("inbox-peek");
  await expect(peek).toBeVisible();
  await expect(peek.getByTestId("peek-user").first()).toContainText("Plan the release of the checkout fix.");
  await expect(note).toHaveValue("hjkwpx 12");
  await shot("5-peek");
  await page.keyboard.press("p");
  await expect(peek).toBeHidden();
  await expect(note).toHaveValue("hjkwpx 12");

  step("walking away and back keeps the draft");
  await page.keyboard.press("j");
  await page.keyboard.press("k");
  await expect(note).toHaveValue("hjkwpx 12");
  await note.fill("");
  await page.keyboard.press("Escape");

  step("number keys answer every question, Enter sends, and the card leaves");
  const send = page.getByTestId("inbox-send");
  await expect(send).toBeDisabled();
  for (let i = 0; i < asked; i++) await page.keyboard.press("1");
  await expect(send).toBeEnabled();
  await shot("6-picked");
  const was = Number((await left.innerText()).split(" ")[0]);
  await page.keyboard.press("Enter");
  await expect(left).toContainText(`${was - 1} left`);
  await expect(page.getByTestId("inbox-item").filter({ hasText: "Plan the checkout release" })).toHaveCount(0);
  const sent = await page.evaluate(() => window.__inboxSent);
  const want = JSON.stringify([{ path: "sessions/shop-claude/answer", body: { tool: "mock-tool", answers: [{ picks: ["Tuesday (Recommended)"] }, { picks: ["On-call"] }] } }]);
  if (JSON.stringify(sent) !== want) throw new Error(`answer sent: ${JSON.stringify(sent)}`);
  await shot("7-answered-next");

  step("resolve without answering can be undone, and the card comes back");
  const now = await title.textContent();
  await page.getByTestId("inbox-resolve").click();
  const undo = page.getByTestId("inbox-undo");
  await expect(undo).toBeVisible();
  await expect(left).toContainText(`${was - 2} left`);
  await shot("8-undo");
  await undo.getByRole("button", { name: "Undo" }).click();
  await expect(left).toContainText(`${was - 1} left`);
  await expect(undo).toBeHidden();
  await expect(page.getByTestId("inbox-item").filter({ hasText: now })).not.toHaveCount(0);
}
