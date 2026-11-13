import type React from "react";

import { linkParts } from "./links.ts";

// A long address has nowhere else to break. Set where text starts, and inherited.
export const WRAP: React.CSSProperties = { overflowWrap: "anywhere" };

// UrlLink opens the whole address through Shipyard. Inside an option it opens
// and leaves the pick alone: the click stops here, and so does Enter, so it
// never reaches the card's shortcuts. Other keys go on, so j, k and w still
// work after a click has focused the link.
export function UrlLink({ url, text, openUrl }: { url: string; text: string; openUrl: (url: string) => void }) {
  return (
    <a
      href={url}
      className="underline"
      data-testid="inbox-link"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openUrl(url);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.stopPropagation();
      }}
    >
      {text}
    </a>
  );
}

// An agent's plain text (a question, an option) with its addresses as links.
export function LinkedText({ text, openUrl }: { text: string; openUrl: (url: string) => void }) {
  return linkParts(text).map((p, i) => (p.url ? <UrlLink key={i} url={p.url} text={p.text} openUrl={openUrl} /> : p.text));
}
