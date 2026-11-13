// inbox-mock: the Inbox on Shipyard's mock fixtures (?mock=1, synthetic "acme"
// data) in a real browser: the sidebar count equals the list, the groups show,
// the walk-through steps one item at a time, a form is answered by keys, the
// peek shows the session beside the card without losing a draft note, and bare
// addresses on a card are links that open whole and never pick an option.
import { readFileSync } from "node:fs";

const dist = new URL("../../../../../dist/index.js", import.meta.url);

// The link cards' addresses, in the fixtures and in the checks.
const PA = "https://preview-a.acme.example/checkout?ref=O'Reilly";
const PB = "https://preview-b.acme.example/checkout";
const LOG = "https://ci.acme.example/builds/1234567890/logs/a-very-long-path-segment-that-has-nowhere-to-break-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?step=deploy&attempt=2";

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
// Addresses on a card: in the question, an option's description, the message,
// and one the box cut short at the end.
const PA = ${JSON.stringify(PA)};
const PB = ${JSON.stringify(PB)};
const LOG = ${JSON.stringify(LOG)};
const LINKS = [
  { kind: "user", id: "u1", text: "Put the acme checkout previews up." },
  { kind: "question", id: "q1", tool: "mock-links", questions: [
    { question: "Which acme preview goes live? Compare " + PA + " and " + PB + ".", options: [
      { label: "Preview A", description: "The deploy log: " + LOG + " (see the last step)." },
      { label: "Preview B" },
      { label: "Hold", description: "Keep https://shop.acme.example/checkout/the-old-one-that-the-box-cut-sho…" },
    ] },
  ] },
];
const NOTES = "The previews are up:\\n\\n- Checkout: https://preview-a.acme.example/checkout.\\n- Plan: [the release plan](https://docs.acme.example/plan)\\n\\nRun \`curl https://api.acme.example/health\` to check.\\n\\n\`\`\`\\nhttps://logs.acme.example/raw\\n\`\`\`\\n\\nMore at https://docs.acme.example/runbook/release-and-roll…";
const wrap = (plugin) => (berth) => {
  window.__inboxSent = [];
  window.__inboxOpened = [];
  const api = Object.create(berth.api);
  api.request = (box, method, path, body) => {
    if (method === "GET" && path === "sessions/shop-claude/transcript") return Promise.resolve({ source: "mock", items: FORM });
    if (method === "GET" && path === "sessions/old-q/transcript") return Promise.resolve({ source: "mock", items: [
      { kind: "user", id: "u1", text: "Pick a colour for acme." },
      { kind: "question", id: "q1", tool: "t", done: true, questions: [{ question: "Which colour?", options: [{ label: "Blue" }] }], answers: ["Blue"] },
      { kind: "tools", id: "t1", verb: "Run", items: [{ verb: "Run", target: "pnpm build" }] },
      { kind: "text", id: "x1", text: "Now the docs." },
      { kind: "notice", id: "n1", notice: "interrupted", text: "Interrupted" },
    ] });
    if (method === "GET" && path === "sessions/acme-links/transcript") return Promise.resolve({ source: "mock", items: LINKS });
    if (method === "GET" && path === "sessions/acme-notes/transcript") return Promise.resolve({ source: "mock", items: [{ kind: "user", id: "u1", text: "Tell me where the previews are." }, { kind: "text", id: "x1", text: NOTES }] });
    if (method === "GET" && path.endsWith("/transcript")) return Promise.resolve({ source: "mock", items: [{ kind: "text", id: "m", text: "Should acme keep the old flag?" }] });
    if (method === "DELETE" && path.startsWith("sessions/")) { window.__inboxSent.push({ method, path }); return Promise.resolve({}); }
    if (method === "POST" && path.endsWith("/answer")) { window.__inboxSent.push({ path, body }); return Promise.resolve({ answered: [] }); }
    return berth.api.request(box, method, path, body);
  };
  // A session interrupted earlier, whose title still asks. Its time is fixed, as
  // a real session's is: an item's identity follows it.
  const stoppedAt = new Date(Date.now() - 30_000).toISOString();
  // The link cards are the newest, so the steps before them never land on them.
  const linksAt = new Date(Date.now() - 5_000).toISOString();
  api.sessions = async (box) => {
    const list = await berth.api.sessions(box);
    return box === "devl"
      ? [
          ...list,
          { name: "old-q", agent: "claude", agent_state: "finished", title: "❓ Pick a colour", location: "shop", state_since: stoppedAt },
          { name: "acme-links", agent: "claude", agent_state: "waiting", title: "Pick the acme preview", location: "shop", state_since: linksAt },
          { name: "acme-notes", agent: "claude", agent_state: "finished", title: "❓ Where the acme previews are", location: "shop", state_since: linksAt },
        ]
      : list;
  };
  // Nothing unsaved anywhere, as far as the check can tell.
  const orchestrate = Object.create(berth.orchestrate);
  orchestrate.exec = () => Promise.resolve({ exit_code: 0, output: "" });
  // A link opens through Shipyard's openUrl: kept here, not opened.
  const openUrl = (url) => window.__inboxOpened.push(url);
  const ctx = new Proxy(berth, { get: (t, k) => (k === "api" ? api : k === "orchestrate" ? orchestrate : k === "openUrl" ? openUrl : t[k]) });
  return plugin(ctx);
};
`;
const source = readFileSync(dist, "utf8").replace(/export \{\s*(\w+) as default\s*\};?/, (_, name) => `${stub}\nexport default wrap(${name});`);
if (!source.includes("export default wrap")) throw new Error("can't find the plugin's default export in dist/index.js");

export const plugins = [{ id: "inbox", name: "Inbox", source }];
export const params = { labs: "0", sidebar: "list", structured: "1" };


// Nothing in the card, nor anything holding it, is wider than it may be.
async function noSideScroll(card, what) {
  const wide = await card.evaluate((el) => {
    const out = [];
    const over = (e) => e.scrollWidth > e.clientWidth + 1 && out.push(`${e.tagName}.${e.className} ${e.scrollWidth}>${e.clientWidth}`);
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) over(e);
    for (const e of el.querySelectorAll("*")) if (getComputedStyle(e).overflowX !== "visible" && e.tagName !== "PRE") over(e);
    if (el.getBoundingClientRect().right > window.innerWidth + 1) out.push(`card right ${el.getBoundingClientRect().right} > ${window.innerWidth}`);
    return out;
  });
  if (wide.length) throw new Error(`${what} scrolls sideways: ${wide.join("; ")}`);
}

export async function run({ page, shot, step, expect }) {
  const lastOpened = () => page.evaluate(() => window.__inboxOpened.at(-1));
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

  step("work folds into one line that opens on a click");
  await page.keyboard.press("p");
  const work = page.getByTestId("inbox-peek").getByTestId("peek-work").first();
  await expect(work).toContainText("Worked · read 1 file");
  await expect(page.getByTestId("inbox-peek")).not.toContainText("Read webhook.ts");
  await work.getByRole("button").click();
  await expect(page.getByTestId("inbox-peek")).toContainText("Read webhook.ts");
  await page.keyboard.press("p");

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

  step("a stale asking title doesn't claim a question: the card says it was interrupted, and so does the peek");
  await page.getByTestId("inbox-item").filter({ hasText: "Pick a colour" }).click();
  await expect(title).toHaveText("Pick a colour");
  await expect(page.getByTestId("inbox-why")).toHaveText("It was interrupted, and waits for what to do instead.");
  await page.keyboard.press("p");
  await expect(page.getByTestId("peek-notice")).toHaveText("It was interrupted, and waits for what to do instead.");
  await shot("7b-interrupted");
  await page.keyboard.press("p");

  step("close session can be undone, and the card comes back");
  await page.getByTestId("inbox-close").click();
  const undo = page.getByTestId("inbox-undo");
  await expect(undo).toBeVisible();
  await expect(left).toContainText(`${was - 2} left`);
  await shot("8-undo");
  await undo.getByRole("button", { name: "Undo" }).click();
  await expect(undo).toBeHidden();
  await expect(left).toContainText(`${was - 1} left`);
  await expect(page.getByTestId("inbox-item").filter({ hasText: "Pick a colour" })).toHaveCount(1);

  step("with nothing unsaved it stops the session, after the few seconds");
  await page.getByTestId("inbox-item").filter({ hasText: "Pick a colour" }).click();
  await page.getByTestId("inbox-close").click();
  await expect(undo).toBeHidden({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__inboxSent.some((c) => c.method === "DELETE" && c.path === "sessions/old-q"))).toBe(true);
  await expect(page.getByTestId("inbox-item").filter({ hasText: "Pick a colour" })).toHaveCount(0);
  await shot("9-closed");

  step("a question's bare addresses are links that open whole, and an option's link never picks it");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId("inbox-item").filter({ hasText: "Pick the acme preview" }).click();
  await expect(title).toHaveText("Pick the acme preview");
  const card = page.getByTestId("inbox-card");
  const links = card.getByTestId("inbox-link");
  await expect(links).toHaveCount(3);
  const hrefs = await links.evaluateAll((as) => as.map((a) => [a.getAttribute("href"), a.textContent]));
  const wantHrefs = [[PA, PA], [PB, PB], [LOG, LOG]];
  if (JSON.stringify(hrefs) !== JSON.stringify(wantHrefs)) throw new Error(`links: ${JSON.stringify(hrefs)}`);
  const options = page.getByTestId("inbox-option");
  await expect(options.nth(2)).toContainText("the-old-one-that-the-box-cut-sho…");
  await expect(options.nth(2).getByTestId("inbox-link")).toHaveCount(0);
  const sentBefore = await page.evaluate(() => window.__inboxSent.length);
  const optionLink = options.nth(0).getByTestId("inbox-link");
  await optionLink.click();
  await expect.poll(() => page.evaluate(() => window.__inboxOpened)).toEqual([LOG]);
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "false");
  step("Enter on an option's link opens it too, and neither picks nor sends");
  await optionLink.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__inboxOpened)).toEqual([LOG, LOG]);
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(title).toHaveText("Pick the acme preview");
  if ((await page.evaluate(() => window.__inboxSent.length)) !== sentBefore) throw new Error("Enter on a link sent the card");
  step("the question's own link opens the whole address, apostrophe and all");
  await links.nth(0).click();
  await expect.poll(lastOpened).toBe(PA);
  step("clicking the option itself still picks it");
  await options.nth(0).click({ position: { x: 12, y: 12 } });
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "true");
  await options.nth(0).click({ position: { x: 12, y: 12 } });
  await expect(options.nth(0)).toHaveAttribute("aria-pressed", "false");
  await noSideScroll(card, "the question card at 1440px");
  await shot("10-links-1440");

  step("a message's bare addresses link, its Markdown link still works, and code and a cut address don't link");
  await page.getByTestId("inbox-item").filter({ hasText: "Where the acme previews are" }).click();
  await expect(title).toHaveText("Where the acme previews are");
  const message = page.getByTestId("inbox-last-message");
  await expect(message).toContainText("release-and-roll…");
  const msgLinks = message.getByTestId("inbox-link");
  await expect(msgLinks).toHaveCount(1);
  await expect(msgLinks).toHaveAttribute("href", "https://preview-a.acme.example/checkout");
  await expect(message.locator("code")).toContainText("curl https://api.acme.example/health");
  await expect(message.locator("code a, pre a")).toHaveCount(0);
  await expect(message.locator("pre")).toContainText("https://logs.acme.example/raw");
  await msgLinks.click();
  await expect.poll(lastOpened).toBe("https://preview-a.acme.example/checkout");
  await message.getByRole("button", { name: "the release plan" }).click();
  await expect.poll(lastOpened).toBe("https://docs.acme.example/plan");
  step("keys still work after a click focused a link");
  await msgLinks.focus();
  await page.keyboard.press("k");
  await expect(title).toHaveText("Pick the acme preview");
  await page.keyboard.press("j");
  await expect(title).toHaveText("Where the acme previews are");
  await noSideScroll(card, "the message card at 1440px");
  await shot("11-message-1440");

  // Shipyard keeps its sidebar at phone width, and the Inbox its list, which
  // leave a card 32px. On a phone you hide the one and walk through the other.
  step("at 390px, with the sidebar hidden and walking through, neither card scrolls sideways");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Hide the sidebar" }).click();
  await page.getByTestId("inbox-walk").click();
  await expect(page.getByTestId("inbox-list")).toBeHidden();
  await expect(title).toHaveText("Where the acme previews are");
  await expect(msgLinks).toHaveCount(1);
  await noSideScroll(card, "the message card at 390px");
  await shot("12-message-390");
  await page.getByTestId("inbox-walk").click();
  await page.getByTestId("inbox-item").filter({ hasText: "Pick the acme preview" }).click();
  await page.getByTestId("inbox-walk").click();
  await expect(title).toHaveText("Pick the acme preview");
  await expect(links).toHaveCount(3);
  await noSideScroll(card, "the question card at 390px");
  await shot("13-links-390");
  await page.getByTestId("inbox-walk").click();
}
