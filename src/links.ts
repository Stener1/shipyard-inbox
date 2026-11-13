// Web addresses in an agent's own text (a question, an option, a message), as
// parts to draw: text, and links that open the whole address. The rules are
// Shipyard's own question card's (app/src/lib/link-text.ts and findUrls with
// prose in term-links.ts), here because a plugin may only use @berth/plugin.

export interface LinkPart {
  text: string;
  // Set when the part is a link: the address it opens.
  url?: string;
}

// http(s) only: mailto:, file: and javascript: stay text. An apostrophe can
// be part of an address (?q=O'Reilly); one that closes a quote is trimmed.
const URL_RE = /\bhttps?:\/\/[^\s<>"`]+/gi;
// A sentence's punctuation, a closing quote, and an ellipsis in mid-text.
const TRAILING = /[.,;:!?'"*»”’…]+$/;
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{", ">": "<" };
// The box cuts a long question, option or message to 1,000 bytes and ends it
// in "…" (sometimes "...").
const CUT = /(?:…|\.\.\.)$/;

const count = (s: string, c: string) => s.split(c).length - 1;

// trimUrl drops what isn't part of an address's end: a sentence's punctuation
// and a closing bracket it doesn't open. "(see https://example.com/a)" links
// https://example.com/a, https://en.wikipedia.org/wiki/Tmux_(software) keeps
// its own.
function trimUrl(url: string): string {
  for (;;) {
    const before = url;
    url = url.replace(TRAILING, "");
    const last = url.at(-1);
    if (last && CLOSERS[last] && count(url, CLOSERS[last]) < count(url, last)) url = url.slice(0, -1);
    if (url === before) return url;
  }
}

// linkParts splits text at its http(s) addresses. An address that runs into
// the box's cut at the very end isn't linked: it would open a page that isn't
// the one meant. atEnd says the text's end is the end of all of it.
export function linkParts(text: string, atEnd = true): LinkPart[] {
  const out: LinkPart[] = [];
  let at = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0];
    if (atEnd && m.index + raw.length === text.length && CUT.test(raw)) continue;
    const url = trimUrl(raw);
    if (!/^https?:\/\/./i.test(url)) continue;
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: url, url });
    at = m.index + url.length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

// One run of a message's line, as the Markdown renderer draws it: text (a
// link when it has a url), bold, inline code, or a Markdown [text](url) link.
export type InlinePart = { kind: "text" | "bold"; text: string; url?: string } | { kind: "code"; text: string } | { kind: "link"; text: string; url: string };

// Code, a Markdown link, a bare address, bold: whichever starts first wins, so
// bold marks inside an address (asterisks are allowed in one) never split it.
const INLINE = /(`[^`\n]+`)|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|(\bhttps?:\/\/[^\s<>"`]+)|\*\*([^*\n]+)\*\*/g;

// inlineParts reads one line of a message. Code stays code, a Markdown link
// stays one, and bare addresses everywhere else are links.
export function inlineParts(text: string): InlinePart[] {
  const out: InlinePart[] = [];
  const push = (p: InlinePart) => {
    const last = out.at(-1);
    if (p.kind === "text" && !p.url && last?.kind === "text" && !last.url) last.text += p.text;
    else out.push(p);
  };
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    const [whole, code, mdText, mdUrl, url, bold] = m;
    if (m.index > at) push({ kind: "text", text: text.slice(at, m.index) });
    at = m.index + whole.length;
    if (code) push({ kind: "code", text: code.slice(1, -1) });
    else if (mdUrl) push({ kind: "link", text: mdText, url: mdUrl });
    else if (url) for (const p of linkParts(url, at === text.length)) push({ kind: "text", ...p });
    else for (const p of linkParts(bold)) push({ kind: "bold", ...p });
  }
  if (at < text.length) push({ kind: "text", text: text.slice(at) });
  return out;
}
