#!/usr/bin/env python3
"""RAG ingestion: chunk health.json, embed with local Ollama, upsert to local Chroma.

Also emits public/data/graph.json (knowledge-graph nodes/edges for the UI).

Usage:
    ./.rag-venv/bin/python rag/ingest.py [--reset]
    # Chroma server must be running: ./.rag-venv/bin/chroma run --path ./chroma-data
    # Ollama must be running with nomic-embed-text pulled.

Everything stays local: no cloud APIs, no API keys.
"""

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import requests
import chromadb

ROOT = Path(__file__).resolve().parent.parent
HEALTH_JSON = ROOT / "public" / "data" / "health.json"
GRAPH_JSON = ROOT / "public" / "data" / "graph.json"

CHROMA_URL = "http://localhost:8000"
OLLAMA_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"
COLLECTION = "health"

EMBED_BATCH = 32
UPSERT_BATCH = 128


def fmt_num(n):
    return f"{n:,}"


def month_key(date_str):
    return date_str[:7]


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def build_documents(data):
    """Return list of (id, text, metadata) tuples."""
    derived = data["derived"]
    datasets = data["datasets"]
    docs = []

    user = derived["userProfile"]
    records = derived["personalRecords"]

    # ---- 1. Profile ----
    docs.append((
        "profile",
        f"User profile: {user['name']} ({user['displayName']}), tracking since {user['memberSince']}, "
        f"timezone {user['timezone']}. {fmt_num(records['totalDaysTracked'])} days tracked, "
        f"{fmt_num(records['totalLifetimeSteps'])} lifetime steps, "
        f"{records['totalLifetimeDistanceKm']:,.0f} km lifetime distance, "
        f"{fmt_num(records['totalWorkoutsLogged'])} structured workouts logged.",
        {"kind": "profile"},
    ))

    # ---- 2. Personal records (one doc each for precise retrieval) ----
    rec_items = [
        ("max-steps-day", "highest single-day step count",
         f"{fmt_num(records['maxStepsDay']['value'])} steps on {records['maxStepsDay']['date']}" if records["maxStepsDay"] else None),
        ("max-calories-day", "highest single-day calorie burn",
         f"{fmt_num(records['maxCaloriesDay']['value'])} kcal on {records['maxCaloriesDay']['date']}" if records["maxCaloriesDay"] else None),
        ("max-distance-day", "longest single-day distance",
         f"{records['maxDistanceDay']['value']:,.1f} km on {records['maxDistanceDay']['date']}" if records["maxDistanceDay"] else None),
        ("best-sleep-score", "best sleep score",
         f"{records['highestSleepScore']['value']}/100 on {records['highestSleepScore']['date']}" if records["highestSleepScore"] else None),
        ("lowest-resting-hr", "lowest resting heart rate",
         f"{records['lowestRestingHR']['value']} bpm on {records['lowestRestingHR']['date']}" if records["lowestRestingHR"] else None),
        ("step-streak", "longest 10k-step streak",
         f"{records['longest10kStreakDays']} days ({records['longestStreakPeriod']})" if records["longest10kStreakDays"] else None),
    ]
    for rid, label, text in rec_items:
        if text:
            docs.append((f"record-{rid}", f"Personal record — {label}: {text}.",
                         {"kind": "record", "record": rid}))

    # ---- 3. Monthly summaries (aggregated across series) ----
    steps_by_m = defaultdict(list)
    for p in derived["dailyStepsSeries"]:
        steps_by_m[month_key(p["date"])].append(p["value"])
    cals_by_m = defaultdict(list)
    for p in derived["dailyCaloriesSeries"]:
        cals_by_m[month_key(p["date"])].append(p["value"])
    dist_by_m = defaultdict(list)
    for p in derived["dailyDistanceSeries"]:
        dist_by_m[month_key(p["date"])].append(p["value"])
    sleep_by_m = defaultdict(list)
    for p in datasets.get("sleepScore", {}).get("series", []):
        sleep_by_m[month_key(p["date"])].append(p["value"])
    rhr_by_m = defaultdict(list)
    for p in datasets.get("restingHR", {}).get("series", []):
        rhr_by_m[month_key(p["date"])].append(p["value"])
    weight_by_m = defaultdict(list)
    for p in datasets.get("weight", {}).get("series", []):
        weight_by_m[month_key(p["date"])].append(p["value"])
    workouts_by_m = defaultdict(list)
    for w in derived["workouts"]:
        workouts_by_m[month_key(w["date"])].append(w)

    months = sorted(set(steps_by_m) | set(cals_by_m) | set(workouts_by_m))
    for m in months:
        steps = steps_by_m.get(m, [])
        cals = cals_by_m.get(m, [])
        dists = dist_by_m.get(m, [])
        sleeps = sleep_by_m.get(m, [])
        rhrs = rhr_by_m.get(m, [])
        weights = weight_by_m.get(m, [])
        wos = workouts_by_m.get(m, [])
        acts = Counter(w["activityName"] for w in wos)
        best_step_day = None
        if steps:
            peak = max(steps)
            # find a date holding the peak (from series order)
            for p in derived["dailyStepsSeries"]:
                if month_key(p["date"]) == m and p["value"] == peak:
                    best_step_day = p["date"]
                    break
        parts = [f"Health summary for {m}:"]
        if steps:
            parts.append(f"averaged {fmt_num(round(mean(steps)))} steps/day over {len(steps)} days"
                         + (f" (best day {fmt_num(max(steps))} steps on {best_step_day})" if best_step_day else "") + ".")
        if cals:
            parts.append(f"Burned an average of {fmt_num(round(mean(cals)))} kcal/day.")
        if dists:
            parts.append(f"Covered {sum(dists):,.1f} km total on foot.")
        if sleeps:
            parts.append(f"Average sleep score {round(mean(sleeps))}/100.")
        if rhrs:
            parts.append(f"Resting heart rate averaged {round(mean(rhrs))} bpm.")
        if weights:
            parts.append(f"Body weight averaged {mean(weights):.1f} kg.")
        if wos:
            top = ", ".join(f"{c} {a}" for a, c in acts.most_common(4))
            parts.append(f"Logged {len(wos)} workouts ({top}) burning {fmt_num(sum(w['calories'] for w in wos))} kcal total.")
        docs.append((f"month-{m}", " ".join(parts), {"kind": "month", "date": m}))

    # ---- 4. Workouts (one doc each) ----
    for w in derived["workouts"]:
        bits = [f"{w['activityName']} workout on {w['date']}"]
        if w["durationMin"]:
            bits.append(f"{w['durationMin']} minutes")
        details = []
        if w["calories"]:
            details.append(f"burned {fmt_num(w['calories'])} kcal")
        if w["steps"]:
            details.append(f"{fmt_num(w['steps'])} steps")
        if w.get("distanceKm"):
            details.append(f"{w['distanceKm']} km")
        if w.get("avgHr"):
            details.append(f"average heart rate {w['avgHr']} bpm")
        zones = []
        if w.get("fatBurnMin"):
            zones.append(f"{w['fatBurnMin']} min fat burn")
        if w.get("cardioMin"):
            zones.append(f"{w['cardioMin']} min cardio")
        if w.get("peakMin"):
            zones.append(f"{w['peakMin']} min peak")
        text = ", ".join(bits)
        if details:
            text += ": " + ", ".join(details)
        text += "."
        if zones:
            text += " Heart-rate zones: " + ", ".join(zones) + "."
        docs.append((f"workout-{w['id']}",
                     text,
                     {"kind": "workout", "date": w["date"], "activity": w["activityName"]}))

    # ---- 4b. Per-activity bests (answers "longest/hardest X" questions) ----
    by_act = defaultdict(list)
    for w in derived["workouts"]:
        by_act[w["activityName"]].append(w)
    for act, wos in sorted(by_act.items()):
        safe = act.lower().replace(" ", "-")
        with_dist = [w for w in wos if w.get("distanceKm")]
        if with_dist:
            b = max(with_dist, key=lambda w: w["distanceKm"])
            docs.append((f"best-{safe}-distance",
                         f"Longest {act} session: {b['distanceKm']} km on {b['date']} "
                         f"({b['durationMin']} min, {fmt_num(b['calories'])} kcal, {fmt_num(b['steps'])} steps).",
                         {"kind": "best", "activity": act, "date": b["date"]}))
        b = max(wos, key=lambda w: w["calories"])
        docs.append((f"best-{safe}-calories",
                     f"Highest-calorie {act} session: {fmt_num(b['calories'])} kcal on {b['date']} "
                     f"({b['durationMin']} min, {fmt_num(b['steps'])} steps).",
                     {"kind": "best", "activity": act, "date": b["date"]}))
        if len(wos) >= 3:
            docs.append((f"activity-{safe}-overview",
                         f"{act}: {len(wos)} sessions logged, "
                         f"{fmt_num(sum(w['calories'] for w in wos))} total kcal, "
                         f"{fmt_num(sum(w['steps'] for w in wos))} total steps.",
                         {"kind": "activity-overview", "activity": act}))

    # ---- 5. Badges ----
    for b in derived["badges"]:
        docs.append((f"badge-{b['id']}",
                     f"Badge earned: {b['name']} ({b.get('category', '')}) — {b.get('description', '')} "
                     f"Earned {b.get('timesAchieved', 1)} time(s).",
                     {"kind": "badge", "date": str(b.get("earnedDate", ""))[:10]}))

    # ---- 6. GPS sessions ----
    for s in derived.get("geoTracks", []):
        start = datetime.fromtimestamp(s["start"] / 1000).strftime("%H:%M UTC")
        km = s["distanceM"] / 1000
        label = f"{s['activity']} session" if s.get("activity") else "GPS-tracked movement session"
        docs.append((f"session-{s['start']}",
                     f"{label} on {s['date']} starting {start}: covered {km:.2f} km "
                     f"with {len(s['points'])} GPS fixes.",
                     {"kind": "session", "date": s["date"],
                      "activity": s.get("activity") or ""}))

    # ---- 7. Overall aggregates (stress, mood, AZM, sleep) ----
    stress = derived.get("stressStatus", {})
    if stress:
        top = max(stress.items(), key=lambda kv: kv[1])
        docs.append(("aggregate-stress",
                     f"Stress tracking: most common stress state is '{top[0]}' "
                     f"({top[1]} readings). Full distribution: " +
                     ", ".join(f"{k}: {v}" for k, v in sorted(stress.items())) + ".",
                     {"kind": "aggregate", "topic": "stress"}))
    mood = derived.get("moodCounts", {})
    if mood:
        docs.append(("aggregate-mood",
                     "Mood reflections: " + ", ".join(f"{k}: {v}" for k, v in sorted(mood.items())) + ".",
                     {"kind": "aggregate", "topic": "mood"}))
    azm = derived.get("azmSeries", [])
    if azm:
        docs.append(("aggregate-azm",
                     f"Active Zone Minutes tracked across {len(azm)} months. "
                     f"Lifetime totals: {fmt_num(sum(a['FAT_BURN'] for a in azm))} fat-burn minutes, "
                     f"{fmt_num(sum(a['CARDIO'] for a in azm))} cardio minutes, "
                     f"{fmt_num(sum(a['PEAK'] for a in azm))} peak minutes.",
                     {"kind": "aggregate", "topic": "azm"}))

    return docs


def embed_texts(texts):
    """Embed via local Ollama (nomic-embed-text), batched."""
    out = []
    for i in range(0, len(texts), EMBED_BATCH):
        batch = texts[i:i + EMBED_BATCH]
        r = requests.post(f"{OLLAMA_URL}/api/embed",
                          json={"model": EMBED_MODEL, "input": batch},
                          timeout=300)
        r.raise_for_status()
        out.extend(r.json()["embeddings"])
        print(f"  embedded {min(i + len(batch), len(texts))}/{len(texts)}", flush=True)
    return out


def build_graph(data):
    """Knowledge-graph nodes/edges for the UI explorer."""
    derived = data["derived"]
    nodes = {}
    edges = []

    def add_node(nid, label, ntype, size=1, detail=""):
        if nid not in nodes:
            nodes[nid] = {"id": nid, "label": label, "type": ntype,
                          "size": size, "detail": detail}
        return nid

    def add_edge(src, dst, label, weight=1):
        edges.append({"source": src, "target": dst, "label": label, "weight": weight})

    user = derived["userProfile"]
    add_node("user", user["displayName"] or user["name"], "user", size=30,
             detail=f"Tracking since {user['memberSince']}")

    # Activities
    by_activity = defaultdict(list)
    for w in derived["workouts"]:
        by_activity[w["activityName"]].append(w)
    for act, wos in by_activity.items():
        total_cal = sum(w["calories"] for w in wos)
        aid = f"activity:{act}"
        add_node(aid, act, "activity", size=min(28, 4 + len(wos) ** 0.5 * 2),
                 detail=f"{len(wos)} sessions · {total_cal:,} kcal")
        add_edge("user", aid, "performed", weight=len(wos))

    # Months + activity→month links
    month_counts = Counter(month_key(w["date"]) for w in derived["workouts"])
    for m, c in sorted(month_counts.items()):
        mid = f"month:{m}"
        add_node(mid, m, "month", size=min(22, 3 + c ** 0.5 * 2),
                 detail=f"{c} workouts")
    for act, wos in by_activity.items():
        per_month = Counter(month_key(w["date"]) for w in wos)
        for m, c in per_month.items():
            add_edge(f"activity:{act}", f"month:{m}", "logged_in", weight=c)

    # GPS sessions
    for s in derived.get("geoTracks", []):
        sid = f"session:{s['start']}"
        km = s["distanceM"] / 1000
        label = s.get("activity") or "Movement"
        add_node(sid, f"{label} · {s['date']}", "session", size=8,
                 detail=f"{km:.2f} km · {len(s['points'])} fixes")
        add_edge(sid, f"month:{month_key(s['date'])}", "occurred_in")
        if s.get("activity") and f"activity:{s['activity']}" in nodes:
            add_edge(f"activity:{s['activity']}", sid, "tracked_as")

    # Badges (top 25 by value to keep the graph readable)
    badges = sorted(derived["badges"], key=lambda b: b.get("value", 0), reverse=True)[:25]
    for b in badges:
        bid = f"badge:{b['id']}"
        add_node(bid, b.get("shortName") or b["name"], "badge", size=7,
                 detail=b.get("description", ""))
        add_edge("user", bid, "earned")

    # Personal records
    records = derived["personalRecords"]
    rec_nodes = [
        ("rec:steps", "Peak steps day",
         f"{records['maxStepsDay']['value']:,} steps on {records['maxStepsDay']['date']}" if records["maxStepsDay"] else ""),
        ("rec:sleep", "Best sleep score",
         f"{records['highestSleepScore']['value']}/100 on {records['highestSleepScore']['date']}" if records["highestSleepScore"] else ""),
        ("rec:streak", "Longest 10k streak",
         f"{records['longest10kStreakDays']} days ({records['longestStreakPeriod']})" if records["longest10kStreakDays"] else ""),
    ]
    for rid, label, detail in rec_nodes:
        if detail:
            add_node(rid, label, "record", size=10, detail=detail)
            add_edge("user", rid, "holds")

    return {"nodes": list(nodes.values()), "edges": edges}


def main():
    reset = "--reset" in sys.argv
    print(f"Loading {HEALTH_JSON} ...")
    data = json.loads(HEALTH_JSON.read_text())

    docs = build_documents(data)
    print(f"Built {len(docs)} documents")

    client = chromadb.HttpClient(host="localhost", port=8000)
    if reset:
        try:
            client.delete_collection(COLLECTION)
            print("Deleted existing collection")
        except Exception as e:
            print(f"(no existing collection: {e})")
    col = client.get_or_create_collection(
        COLLECTION, metadata={"hnsw:space": "cosine"})

    texts = [t for _, t, _ in docs]
    print("Embedding with Ollama nomic-embed-text ...")
    embeddings = embed_texts(texts)

    ids = [i for i, _, _ in docs]
    metas = [m for _, _, m in docs]
    for i in range(0, len(ids), UPSERT_BATCH):
        col.upsert(ids=ids[i:i + UPSERT_BATCH],
                   documents=texts[i:i + UPSERT_BATCH],
                   metadatas=metas[i:i + UPSERT_BATCH],
                   embeddings=embeddings[i:i + UPSERT_BATCH])
        print(f"  upserted {min(i + UPSERT_BATCH, len(ids))}/{len(ids)}")
    print(f"Collection '{COLLECTION}' now holds {col.count()} documents")

    graph = build_graph(data)
    GRAPH_JSON.write_text(json.dumps(graph))
    print(f"Wrote {GRAPH_JSON} ({len(graph['nodes'])} nodes, {len(graph['edges'])} edges)")


if __name__ == "__main__":
    main()
