import type { BerthPluginContext } from "@berth/plugin";
import { useEvent } from "@berth/plugin";
import { Button, Icon, Skeleton } from "@berth/plugin/ui";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Markdown } from "./markdown.tsx";
import type { Item, TranscriptItem } from "./model.ts";
import { errText, openSession, readTranscript } from "./store.ts";

// The session beside the card: read-only, following along, so you can dive into
// the context of a question without leaving the Inbox or losing your answer.

const KEEP = 200;

function Row({ it, openUrl }: { it: TranscriptItem; openUrl: (u: string) => void }) {
  switch (it.kind) {
    case "user":
      return (
        <div className="rounded-md bg-muted p-2 text-sm" data-testid="peek-user">
          <Markdown text={it.text ?? ""} openUrl={openUrl} />
        </div>
      );
    case "text":
      return (
        <div className="text-sm" data-testid="peek-text">
          <Markdown text={it.text ?? ""} openUrl={openUrl} />
        </div>
      );
    case "tools": {
      // What it ran or read, when the box says.
      const targets = (it.items ?? []).map((t) => t.target).filter(Boolean);
      return <p className="truncate font-mono text-xs text-muted-foreground">{[it.verb, targets.join(", ")].filter(Boolean).join(" ")}</p>;
    }
    case "edit":
      return <p className="truncate font-mono text-xs text-muted-foreground">Edited {it.file}</p>;
    case "ask":
      return <p className="text-xs text-muted-foreground">Asked to use {it.tool}: {it.detail}</p>;
    case "command":
      return <p className="truncate font-mono text-xs text-muted-foreground">{it.command}</p>;
    case "question":
      return (
        <div className="rounded-md border p-2 text-sm">
          {it.questions?.map((q, i) => (
            <p key={i}>
              <span className="font-medium">{q.question}</span>
              {it.answers?.[i] && <span className="text-muted-foreground"> {it.answers[i]}</span>}
            </p>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function Peek({ berth, item, onClose }: { berth: BerthPluginContext; item: Item; onClose(): void }) {
  const [items, setItems] = useState<TranscriptItem[]>();
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const session = item.session;

  useEvent("agent.*", (e) => {
    if (e.box === item.box && (e.data?.session === session || e.data?.name === session)) setTick((n) => n + 1);
  });

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setError(undefined);
    readTranscript(item.box, session).then(
      (t) => alive && setItems(t.slice(-KEEP)),
      (err) => alive && setError(errText(err)),
    );
    return () => {
      alive = false;
    };
  }, [item.box, session, tick]);

  useEffect(() => setItems(undefined), [item.box, session]);

  // Opens at the latest message, and stays there unless you've scrolled up.
  const stuck = useRef(true);
  useLayoutEffect(() => {
    if (stuck.current) end.current?.scrollIntoView({ block: "end" });
  }, [items]);

  return (
    <aside className="flex min-h-0 min-w-0 flex-col border-l" style={{ width: "44%", flexShrink: 0 }} data-testid="inbox-peek">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
        <Button size="xs" variant="ghost" onClick={() => openSession(item)}>
          Open
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Hide session" onClick={onClose}>
          <Icon name="X" />
        </Button>
      </div>
      <div
        ref={scroller}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {error && <p className="text-sm text-muted-foreground">Couldn't read the session: {error}</p>}
        {!items && !error && <Skeleton className="h-40 w-full" />}
        {items?.length === 0 && <p className="text-sm text-muted-foreground">Nothing to show from this session yet.</p>}
        {items?.map((it) => <Row key={it.id} it={it} openUrl={(u) => berth.openUrl(u)} />)}
        <div ref={end} />
      </div>
    </aside>
  );
}
