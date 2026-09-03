"use client";

import * as React from "react";
import { Send, Bot, User, Sparkles, ChevronDown, Loader2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MODELS = [
  { id: "llama3.2:latest", label: "Llama 3.2", hint: "fast" },
  { id: "gemma4:26b", label: "Gemma 26B", hint: "smarter, slower" },
] as const;

const SUGGESTIONS = [
  "What was my longest run?",
  "How consistent am I with the 10k step goal?",
  "Summarize my best month of training.",
  "How is my resting heart rate trend?",
];

interface Source {
  index: number;
  kind: string;
  date: string | null;
  activity: string | null;
  text: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

/** Tiny deterministic markdown renderer (bold, bullets, numbered lists, paragraphs). */
function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}|\n/);
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        const renderInline = (s: string, keyPrefix: string) =>
          s.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
            if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
              return (
                <strong key={`${keyPrefix}-${pi}`} className="font-semibold text-foreground">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <React.Fragment key={`${keyPrefix}-${pi}`}>{part}</React.Fragment>;
          });
        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <div key={bi} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{renderInline(trimmed.replace(/^[-*•]\s+/, ""), `b${bi}`)}</span>
            </div>
          );
        }
        if (/^\d+[.)]\s+/.test(trimmed)) {
          const num = trimmed.match(/^(\d+)[.)]/)?.[1];
          return (
            <div key={bi} className="flex gap-2">
              <span className="font-semibold text-primary">{num}.</span>
              <span>{renderInline(trimmed.replace(/^\d+[.)]\s+/, ""), `n${bi}`)}</span>
            </div>
          );
        }
        if (/^#{1,3}\s+/.test(trimmed)) {
          return (
            <div key={bi} className="text-[13px] font-bold text-foreground">
              {renderInline(trimmed.replace(/^#{1,3}\s+/, ""), `h${bi}`)}
            </div>
          );
        }
        return <p key={bi}>{renderInline(trimmed, `p${bi}`)}</p>;
      })}
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = React.useState(false);
  if (!sources.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {sources.length} source{sources.length === 1 ? "" : "s"} from your data
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-border p-2.5">
          {sources.map((s) => (
            <div key={s.index} className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="mr-1.5 rounded bg-primary/10 px-1 py-0.5 font-bold text-primary">
                {s.index}
              </span>
              <span className="font-semibold text-foreground">
                {s.kind}
                {s.activity ? ` · ${s.activity}` : ""}
                {s.date ? ` · ${s.date}` : ""}
              </span>
              <div className="mt-0.5">{s.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AICoach() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [model, setModel] = React.useState<string>(MODELS[0].id);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setError(null);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    let assistant = "";
    let sources: Source[] = [];
    const upsertAssistant = () =>
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { role: "assistant", content: assistant, sources }];
        }
        return [...prev, { role: "assistant", content: assistant, sources }];
      });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, model, history }),
      });
      const ctype = res.headers.get("content-type") ?? "";
      if (!res.ok || !ctype.includes("text/event-stream")) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? `Request failed (${res.status}).`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5));
            if (evt.sources) sources = evt.sources as Source[];
            if (typeof evt.token === "string") assistant += evt.token;
            upsertAssistant();
          } catch {
            // ignore partial events
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-card-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Health Coach
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Answers grounded in your data via local RAG (ChromaDB + Ollama — fully offline).
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                disabled={loading}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  model === m.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={m.hint}
              >
                {m.label}
                <span className="ml-1 font-medium opacity-70">· {m.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-muted/20 p-4">
          {messages.length === 0 && (
            <div className="m-auto flex max-w-md flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Ask anything about your health data
              </p>
              <p className="text-xs text-muted-foreground">
                Every answer is retrieved from your workouts, sleep, records and monthly
                summaries — nothing is made up.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-xs transition-all hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground shadow-xs"
                }`}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <>
                    {m.content ? (
                      <RichText text={m.content} />
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                      </span>
                    )}
                    {m.sources && m.sources.length > 0 && m.content && (
                      <SourceList sources={m.sources} />
                    )}
                  </>
                )}
              </div>
              {m.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {error}
                <span className="mt-1 block opacity-80">
                  Make sure Ollama (`ollama serve`) and Chroma
                  (`.rag-venv/bin/chroma run --path ./chroma-data`) are running, then run `pnpm rag:ingest`.
                </span>
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about workouts, sleep, records, trends…"
            className="h-10 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm text-foreground shadow-xs focus:border-primary focus:outline-none"
          />
          <Button type="submit" size="sm" className="h-10 gap-1.5 rounded-xl px-4" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </Button>
        </form>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            ChromaDB · local
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Ollama · {model === MODELS[0].id ? "Llama 3.2" : "Gemma 26B"}
          </Badge>
          <span className="ml-auto">Private — data never leaves this machine.</span>
        </div>
      </CardContent>
    </Card>
  );
}
