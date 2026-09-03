"use client";

import * as React from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import { Network, Search, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  size: number;
  detail: string;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
}

interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  label: string;
  weight: number;
}

const TYPE_COLORS: Record<string, string> = {
  user: "var(--color-primary)",
  activity: "var(--color-chart-2)",
  month: "var(--color-chart-3)",
  session: "var(--color-chart-4)",
  badge: "var(--color-chart-5)",
  record: "var(--color-destructive)",
};

const TYPE_LABELS: Record<string, string> = {
  user: "User",
  activity: "Activity",
  month: "Month",
  session: "Session",
  badge: "Badge",
  record: "Record",
};

const WIDTH = 900;
const HEIGHT = 560;

const nodeRadius = (size: number) => Math.max(5, Math.min(22, 3 + size * 0.8));

export function KnowledgeGraph() {
  const [graph, setGraph] = React.useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [activeTypes, setActiveTypes] = React.useState<Set<string>>(
    new Set(["user", "activity", "month", "session", "badge", "record"])
  );
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Layout snapshot: updated on every simulation tick so SVG renders from
  // state (never by reading refs during render).
  const [snap, setSnap] = React.useState<SimNode[]>([]);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });

  const simRef = React.useRef<ReturnType<typeof forceSimulation<SimNode, SimLink>> | null>(null);
  const posRef = React.useRef<Map<string, SimNode>>(new Map());
  const dragRef = React.useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);

  React.useEffect(() => {
    fetch("/data/graph.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("graph.json missing"))))
      .then(setGraph)
      .catch(() => setGraph({ nodes: [], edges: [] }));
  }, []);

  const filtered = React.useMemo(() => {
    if (!graph) return null;
    const q = query.trim().toLowerCase();
    const nodes = graph.nodes.filter(
      (n) => activeTypes.has(n.type) && (!q || n.label.toLowerCase().includes(q))
    );
    const ids = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    return { nodes, edges };
  }, [graph, activeTypes, query]);

  // (Re)run the force layout whenever the visible subgraph changes.
  React.useEffect(() => {
    if (!filtered || !filtered.nodes.length) return;
    simRef.current?.stop();
    const nodes: SimNode[] = filtered.nodes.map((n) => {
      const prev = posRef.current.get(n.id);
      return { ...n, x: prev?.x ?? (Math.random() - 0.5) * WIDTH, y: prev?.y ?? (Math.random() - 0.5) * HEIGHT };
    });
    const links: SimLink[] = filtered.edges.map((e) => ({ ...e }));
    const sim = forceSimulation<SimNode, SimLink>(nodes)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(70).strength(0.6))
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collide", forceCollide<SimNode>().radius((d) => nodeRadius(d.size) + 6))
      .on("tick", () => setSnap([...sim.nodes()]))
      .on("end", () => {
        posRef.current = new Map(nodes.map((n) => [n.id, n]));
      });
    simRef.current = sim;
    return () => {
      sim.stop();
      posRef.current = new Map(nodes.map((n) => [n.id, n]));
    };
  }, [filtered]);

  const posById = React.useMemo(() => new Map(snap.map((n) => [n.id, n])), [snap]);

  const neighborIds = React.useMemo(() => {
    if (!filtered || !selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const e of filtered.edges) {
      if (e.source === selectedId) set.add(e.target);
      if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [filtered, selectedId]);

  const selected = filtered?.nodes.find((n) => n.id === selectedId) ?? null;
  const selectedEdges = React.useMemo(() => {
    if (!filtered || !selectedId) return [];
    return filtered.edges.filter((e) => e.source === selectedId || e.target === selectedId);
  }, [filtered, selectedId]);

  const nodeById = React.useMemo(() => {
    const m = new Map<string, GraphNode>();
    filtered?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [filtered]);

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    setSelectedId(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    const k = Math.min(3, Math.max(0.4, view.k * (e.deltaY > 0 ? 0.9 : 1.1)));
    setView((v) => ({ ...v, k }));
  };

  return (
    <Card className="w-full rounded-3xl border border-border bg-card p-5 shadow-sm">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-card-foreground">
              <Network className="h-4 w-4 text-primary" />
              Health Knowledge Graph
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {filtered ? (
                <>
                  {filtered.nodes.length} entities · {filtered.edges.length} relationships — drag to pan, scroll to zoom, click a node.
                </>
              ) : (
                "Loading entity graph…"
              )}
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities…"
              className="h-9 w-48 rounded-xl border border-input bg-background pl-8 pr-3 text-xs text-foreground shadow-xs focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.keys(TYPE_LABELS).map((t) => {
            const count = graph?.nodes.filter((n) => n.type === t).length ?? 0;
            const on = activeTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  on
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground opacity-60 hover:opacity-100"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[t] }}
                />
                {TYPE_LABELS[t]}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
            {!filtered || !filtered.nodes.length ? (
              <div className="grid h-[400px] place-items-center text-xs text-muted-foreground">
                {graph ? "No entities match — adjust filters or search." : "Loading graph…"}
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-[560px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
                onWheel={onWheel}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  dragRef.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
                }}
                onPointerMove={(e) => {
                  const d = dragRef.current;
                  if (!d) return;
                  const scale = WIDTH / (e.currentTarget.clientWidth || WIDTH);
                  setView((v) => ({
                    ...v,
                    x: d.vx + (e.clientX - d.sx) * scale,
                    y: d.vy + (e.clientY - d.sy) * scale,
                  }));
                }}
                onPointerUp={() => (dragRef.current = null)}
                onPointerLeave={() => (dragRef.current = null)}
                onClick={() => setSelectedId(null)}
              >
                <g transform={`translate(${WIDTH / 2 - (WIDTH / 2 - view.x) * view.k} ${HEIGHT / 2 - (HEIGHT / 2 - view.y) * view.k}) scale(${view.k})`}>
                  <Links
                    filtered={filtered}
                    posById={posById}
                    neighborIds={neighborIds}
                    selectedId={selectedId}
                  />
                  <Nodes
                    filtered={filtered}
                    posById={posById}
                    neighborIds={neighborIds}
                    selectedId={selectedId}
                    onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
                  />
                </g>
              </svg>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            {selected ? (
              <div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  {TYPE_LABELS[selected.type] ?? selected.type}
                </Badge>
                <h4 className="mt-2 text-sm font-bold text-foreground">{selected.label}</h4>
                {selected.detail && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selected.detail}</p>
                )}
                <div className="mt-3 border-t border-border pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Connections ({selectedEdges.length})
                  </div>
                  <div className="mt-1.5 flex max-h-72 flex-col gap-1 overflow-y-auto">
                    {selectedEdges.slice(0, 60).map((e, i) => {
                      const otherId = e.source === selected.id ? e.target : e.source;
                      const other = nodeById.get(otherId);
                      if (!other) return null;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedId(otherId)}
                          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] hover:bg-muted"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: TYPE_COLORS[other.type] }}
                          />
                          <span className="truncate text-foreground">{other.label}</span>
                          <span className="ml-auto shrink-0 text-muted-foreground opacity-70">
                            {e.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center">
                <MousePointerClick className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Click any node to inspect it and walk its relationships.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {Object.entries(TYPE_LABELS).map(([t, label]) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] }} />
              {label}
            </span>
          ))}
          <span className="ml-auto">Built locally from your Takeout export — no cloud calls.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function linkEndpoints(
  e: GraphEdge,
  posById: Map<string, SimNode>
): [SimNode, SimNode] | null {
  const a = posById.get(e.source);
  const b = posById.get(e.target);
  return a && b ? [a, b] : null;
}

function Nodes({
  filtered,
  posById,
  neighborIds,
  selectedId,
  onSelect,
}: {
  filtered: { nodes: GraphNode[]; edges: GraphEdge[] };
  posById: Map<string, SimNode>;
  neighborIds: Set<string> | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <g>
      {filtered.nodes.map((n) => {
        const p = posById.get(n.id);
        if (!p) return null;
        const dim = neighborIds && !neighborIds.has(n.id);
        const r = nodeRadius(n.size);
        const showLabel = n.size >= 9 || n.id === selectedId || (neighborIds?.has(n.id) ?? false);
        return (
          <g
            key={n.id}
            transform={`translate(${p.x},${p.y})`}
            opacity={dim ? 0.25 : 1}
            className="cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(n.id);
            }}
          >
            <title>{`${n.label}${n.detail ? ` — ${n.detail}` : ""}`}</title>
            {n.id === selectedId && (
              <circle r={r + 5} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.7} />
            )}
            <circle r={r} fill={TYPE_COLORS[n.type] ?? "var(--color-muted-foreground)"} fillOpacity={dim ? 0.4 : 0.9} stroke="#fff" strokeWidth={1.5} />
            {showLabel && (
              <text
                y={-r - 4}
                textAnchor="middle"
                fontSize={10 - Math.min(3, 24 / Math.max(12, n.label.length))}
                fontWeight={600}
                fill="var(--color-foreground)"
                stroke="var(--color-background)"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function Links({
  filtered,
  posById,
  neighborIds,
  selectedId,
}: {
  filtered: { nodes: GraphNode[]; edges: GraphEdge[] };
  posById: Map<string, SimNode>;
  neighborIds: Set<string> | null;
  selectedId: string | null;
}) {
  return (
    <g>
      {filtered.edges.map((e, i) => {
        const pts = linkEndpoints(e, posById);
        if (!pts) return null;
        const [a, b] = pts;
        const active = selectedId && (e.source === selectedId || e.target === selectedId);
        const dim = neighborIds && !active;
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-border)"
            strokeOpacity={active ? 0.9 : dim ? 0.25 : 0.6}
            strokeWidth={active ? 1.8 : 0.8 + Math.min(1.5, (e.weight - 1) * 0.15)}
          />
        );
      })}
    </g>
  );
}
