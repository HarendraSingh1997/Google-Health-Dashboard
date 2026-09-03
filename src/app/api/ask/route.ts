import { NextRequest } from "next/server";
import { ChromaClient } from "chromadb";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";
const EMBED_MODEL = "nomic-embed-text";
const DEFAULT_MODEL = "llama3.2:latest";
const ALLOWED_MODELS = new Set(["llama3.2:latest", "gemma4:26b"]);
const TOP_K = 8;

export const CHAT_MODELS = ["llama3.2:latest", "gemma4:26b"] as const;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function chromaClient(): ChromaClient {
  const u = new URL(CHROMA_URL);
  return new ChromaClient({
    host: u.hostname,
    port: Number(u.port || "8000"),
    ssl: u.protocol === "https:",
  });
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Ollama embed failed (${res.status}) — is Ollama running?`);
  const json = await res.json();
  return json.embeddings[0] as number[];
}

export async function POST(req: NextRequest) {
  let body: { question?: string; model?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) return Response.json({ error: "Missing question." }, { status: 400 });
  const model = ALLOWED_MODELS.has(body.model ?? "") ? (body.model as string) : DEFAULT_MODEL;
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  // 1. Embed the question with local Ollama.
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embed(question);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Embedding failed." },
      { status: 502 }
    );
  }

  // 2. Retrieve context from local Chroma.
  let docs: string[] = [];
  let metas: Record<string, string | number | boolean | null | undefined>[] = [];
  try {
    const client = chromaClient();
    const col = await client.getCollection({ name: "health" });
    const res = await col.query({
      queryEmbeddings: [queryEmbedding],
      nResults: TOP_K,
      include: ["documents", "metadatas"] as never,
    });
    docs = (res.documents[0] ?? []).filter((d): d is string => typeof d === "string");
    metas = (res.metadatas[0] ?? []) as typeof metas;
  } catch {
    return Response.json(
      {
        error:
          "ChromaDB is unreachable or the 'health' collection is missing. " +
          "Start it with `.rag-venv/bin/chroma run --path ./chroma-data` and ingest via `pnpm rag:ingest`.",
      },
      { status: 503 }
    );
  }

  const context = docs.map((d, i) => `[${i + 1}] ${d}`).join("\n");
  const sources = docs.map((d, i) => ({
    index: i + 1,
    kind: String(metas[i]?.kind ?? "unknown"),
    date: metas[i]?.date != null ? String(metas[i]?.date) : null,
    activity: metas[i]?.activity ? String(metas[i]?.activity) : null,
    text: d,
  }));

  const system = [
    "You are a health-data analyst for Harendra's personal Fitbit/Google Health dashboard.",
    "Answer ONLY from the context snippets below. If the answer is not in the context, say so honestly.",
    "Use specific dates and numbers from the context. Keep answers concise (under 150 words unless asked for detail).",
    "Use light markdown (bold key figures, short lists). Never invent workouts, dates, or metrics.",
  ].join(" ");

  const messages = [
    { role: "system", content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user",
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  // 3. Stream the answer from local Ollama as SSE.
  let chatRes: Response;
  try {
    chatRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });
  } catch {
    return Response.json(
      { error: "Ollama is unreachable. Start it with `ollama serve`." },
      { status: 502 }
    );
  }
  if (!chatRes.ok || !chatRes.body) {
    return Response.json(
      { error: `Ollama chat failed (${chatRes.status}). Is model '${model}' pulled?` },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
      const reader = chatRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed);
              if (typeof chunk.message?.content === "string" && chunk.message.content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: chunk.message.content })}\n\n`)
                );
              }
              if (chunk.done) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
              }
            } catch {
              // ignore partial JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
