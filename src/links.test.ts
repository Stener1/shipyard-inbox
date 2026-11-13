import assert from "node:assert/strict";
import { test } from "node:test";

import { inlineParts, linkParts } from "./links.ts";

// The cases follow Shipyard's own question card (app/src/lib/link-text.test.ts).

const OAUTH = "https://shop.example.com/admin/oauth/authorize?client_id=0000example&scope=read_products,write_products&redirect_uri=https%3A%2F%2Fapp.example.com%2Fauth%2Fcallback&state=mock-state-1234567890abcdef";

test("a long sign-in address with a query string is one link, whole", () => {
  assert.deepEqual(linkParts(`Open ${OAUTH} to approve the app`), [{ text: "Open " }, { text: OAUTH, url: OAUTH }, { text: " to approve the app" }]);
});

test("punctuation that ends the sentence stays out of the link", () => {
  assert.deepEqual(linkParts("See https://example.com/a."), [{ text: "See " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: "." }]);
  for (const end of [",", ";", ":", "!", "?", '"', "»", "”", "’"])
    assert.deepEqual(linkParts(`See https://example.com/a${end} now`), [{ text: "See " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: `${end} now` }], end);
});

test("a closing bracket the address doesn't open stays out, one it opens stays in", () => {
  assert.deepEqual(linkParts("(see https://example.com/b)"), [{ text: "(see " }, { text: "https://example.com/b", url: "https://example.com/b" }, { text: ")" }]);
  assert.deepEqual(linkParts("[https://example.com/c]."), [{ text: "[" }, { text: "https://example.com/c", url: "https://example.com/c" }, { text: "]." }]);
  const wiki = "https://en.wikipedia.org/wiki/Tmux_(software)";
  assert.deepEqual(linkParts(`Read ${wiki}.`), [{ text: "Read " }, { text: wiki, url: wiki }, { text: "." }]);
});

test("every address in the text is a link", () => {
  assert.deepEqual(linkParts("https://a.example.com and http://b.example.com/x"), [
    { text: "https://a.example.com", url: "https://a.example.com" },
    { text: " and " },
    { text: "http://b.example.com/x", url: "http://b.example.com/x" },
  ]);
});

test("an address the box cut short, into its trailing … or ..., is shown but not linked", () => {
  const clipped = `Open ${OAUTH.slice(0, 120)}…`;
  assert.deepEqual(linkParts(clipped), [{ text: clipped }]);
  assert.deepEqual(linkParts(`Open ${OAUTH.slice(0, 120)}...`), [{ text: `Open ${OAUTH.slice(0, 120)}...` }]);
  // Cut right after a punctuation mark the address doesn't end in, too.
  assert.deepEqual(linkParts("Open https://example.com/a?x=1&…"), [{ text: "Open https://example.com/a?x=1&…" }]);
  // Only the cut one: an address before it still links.
  assert.deepEqual(linkParts("Compare https://example.com/a with https://example.com/b/lo…"), [
    { text: "Compare " },
    { text: "https://example.com/a", url: "https://example.com/a" },
    { text: " with https://example.com/b/lo…" },
  ]);
});

test("an apostrophe in an address is part of it, and a quote around one isn't", () => {
  const url = "https://example.com/search?q=O'Reilly&page=2";
  assert.deepEqual(linkParts(`See ${url} now`), [{ text: "See " }, { text: url, url }, { text: " now" }]);
  assert.deepEqual(linkParts("Open 'https://example.com/a' first"), [{ text: "Open '" }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: "' first" }]);
});

test("an address with an apostrophe that the box cut short is not linked either", () => {
  assert.deepEqual(linkParts("Open https://example.com/search?q=O'Reill…"), [{ text: "Open https://example.com/search?q=O'Reill…" }]);
});

test("an ellipsis inside the text is not the box's cut", () => {
  assert.deepEqual(linkParts("Try https://example.com/a… or not"), [{ text: "Try " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: "… or not" }]);
  assert.deepEqual(linkParts("Try https://example.com/a... or not"), [{ text: "Try " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: "... or not" }]);
  // A sentence's punctuation before the ellipsis stays out of the link too.
  assert.deepEqual(linkParts("Try https://example.com/a.… or not"), [{ text: "Try " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: ".… or not" }]);
  assert.deepEqual(linkParts("(try https://example.com/a)… or not"), [{ text: "(try " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: ")… or not" }]);
});

test("an address that ended before the cut is still a link", () => {
  assert.deepEqual(linkParts("Open https://example.com/a and then some words that run on…"), [{ text: "Open " }, { text: "https://example.com/a", url: "https://example.com/a" }, { text: " and then some words that run on…" }]);
});

test("other schemes are not linked", () => {
  assert.deepEqual(linkParts("Mail mailto:ops@example.com or open file:///etc/hosts"), [{ text: "Mail mailto:ops@example.com or open file:///etc/hosts" }]);
  assert.deepEqual(linkParts("javascript:alert(1)"), [{ text: "javascript:alert(1)" }]);
  assert.deepEqual(linkParts("https:// alone"), [{ text: "https:// alone" }]);
});

test("text without an address is one part, and no text is none", () => {
  assert.deepEqual(linkParts("Which release?"), [{ text: "Which release?" }]);
  assert.deepEqual(linkParts(""), []);
});

test("in a message, a Markdown link stays a Markdown link", () => {
  assert.deepEqual(inlineParts("Read [the plan](https://example.com/plan) first."), [
    { kind: "text", text: "Read " },
    { kind: "link", text: "the plan", url: "https://example.com/plan" },
    { kind: "text", text: " first." },
  ]);
});

test("in a message, an address in backticks stays code", () => {
  assert.deepEqual(inlineParts("Run `curl https://example.com/x` now"), [
    { kind: "text", text: "Run " },
    { kind: "code", text: "curl https://example.com/x" },
    { kind: "text", text: " now" },
  ]);
});

test("in a message, a bare address links, bold or not", () => {
  assert.deepEqual(inlineParts("Preview: https://example.com/p, and **https://example.com/q**."), [
    { kind: "text", text: "Preview: " },
    { kind: "text", text: "https://example.com/p", url: "https://example.com/p" },
    { kind: "text", text: ", and " },
    { kind: "bold", text: "https://example.com/q", url: "https://example.com/q" },
    { kind: "text", text: "." },
  ]);
});

test("in a message, bold marks inside an address don't split it", () => {
  // Cut short: no part of it may link.
  const cut = "Open https://example.com/**segment**/trunc…";
  assert.deepEqual(inlineParts(cut), [{ kind: "text", text: cut }]);
  // Whole: it links whole.
  const url = "https://example.com/**segment**/page";
  assert.deepEqual(inlineParts(`Open ${url} now`), [{ kind: "text", text: "Open " }, { kind: "text", text: url, url }, { kind: "text", text: " now" }]);
});

test("in a message, an ellipsis mid-text after an address is the sentence's", () => {
  assert.deepEqual(inlineParts("Try https://example.com/a… or `x`"), [
    { kind: "text", text: "Try " },
    { kind: "text", text: "https://example.com/a", url: "https://example.com/a" },
    { kind: "text", text: "… or " },
    { kind: "code", text: "x" },
  ]);
});

test("in a message, an address cut at the very end isn't linked", () => {
  assert.deepEqual(inlineParts("See https://example.com/a and https://example.com/lo…"), [
    { kind: "text", text: "See " },
    { kind: "text", text: "https://example.com/a", url: "https://example.com/a" },
    { kind: "text", text: " and https://example.com/lo…" },
  ]);
});
