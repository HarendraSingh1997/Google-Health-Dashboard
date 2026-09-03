import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/Users/harendrasingh/projects/Google-Health-Data/Takeout 2/Google Health";
const OUT_DIR = join(process.cwd(), "public", "data");
const OUT_FILE = join(OUT_DIR, "health.json");

// Skip the expensive full aggregation when the output is newer than the
// source export (predev/prebuild run on every dev/build). Use --force to rebuild.
if (!process.argv.includes("--force")) {
  try {
    const outStat = statSync(OUT_FILE);
    const rootStat = statSync(ROOT);
    if (outStat.mtimeMs > rootStat.mtimeMs) {
      console.log("✓ health.json is up to date, skipping rebuild (use --force to rebuild)");
      process.exit(0);
    }
  } catch {
    // Output or source missing — fall through to full rebuild.
  }
}

// ---- CSV parser ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function loadCSV(relPath) {
  const p = join(ROOT, relPath);
  try {
    if (!existsSync(p)) return { headers: [], data: [] };
    const rows = parseCSV(readFileSync(p, "utf8"));
    if (rows.length < 2) return { headers: [], data: [] };
    const headers = rows[0].map((h) => h.trim());
    const data = rows.slice(1).map((r) => {
      const o = {};
      headers.forEach((h, i) => (o[h] = r[i]));
      return o;
    });
    return { headers, data };
  } catch (e) {
    console.warn("skip", relPath, e.message);
    return { headers: [], data: [] };
  }
}

function dateOnly(iso) {
  return iso ? iso.slice(0, 10) : "";
}

function monthlyKey(iso) {
  return iso ? iso.slice(0, 7) : "";
}

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function dailySeries(relPath, valueCol, { transform } = {}) {
  const { data } = loadCSV(relPath);
  const out = [];
  for (const r of data) {
    const d = dateOnly(r.timestamp || "");
    if (!d || d.length < 10) continue;
    let v = num(r[valueCol]);
    if (v === null) continue;
    if (transform) v = transform(v, r);
    out.push({ date: d, value: v });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function summarize(series) {
  if (!series || !series.length) return null;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < series.length; i++) {
    const v = series[i].value;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const avg = sum / series.length;
  const first = series[0];
  const last = series[series.length - 1];
  const trendPct =
    first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : 0;
  return {
    count: series.length,
    avg: +avg.toFixed(2),
    min: +min.toFixed(2),
    max: +max.toFixed(2),
    latest: +last.value.toFixed(2),
    firstDate: first.date,
    lastDate: last.date,
    trendPct: +trendPct.toFixed(1),
  };
}

// ============ Global Export Data - Parse Daily JSON Series ============
const globalDir = join(ROOT, "Global Export Data");

function parseDailyJSONSum(prefix, valScale = 1) {
  if (!existsSync(globalDir)) return [];
  const files = readdirSync(globalDir).filter((f) => f.startsWith(prefix + "-") && f.endsWith(".json"));
  const daily = {};
  for (const f of files) {
    try {
      const arr = JSON.parse(readFileSync(join(globalDir, f), "utf8"));
      for (const item of arr) {
        if (!item.dateTime) continue;
        const m = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(item.dateTime);
        if (!m) continue;
        const [, mm, dd, yy] = m;
        const date = `20${yy}-${mm}-${dd}`;
        const val = (parseFloat(item.value) || 0) * valScale;
        daily[date] = (daily[date] || 0) + val;
      }
    } catch {}
  }
  return Object.entries(daily)
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Daily Steps, Calories, Distance
const dailyStepsSeries = parseDailyJSONSum("steps", 1).map((s) => ({ date: s.date, value: Math.round(s.value) }));
const dailyCaloriesSeries = parseDailyJSONSum("calories", 1).map((s) => ({ date: s.date, value: Math.round(s.value) }));
const dailyDistanceSeries = parseDailyJSONSum("distance", 0.00001).map((s) => ({ date: s.date, value: +(s.value).toFixed(2) })); // cm to km

// Daily Activity Intensity
const sedentaryDaily = parseDailyJSONSum("sedentary_minutes", 1);
const lightlyDaily = parseDailyJSONSum("lightly_active_minutes", 1);
const moderatelyDaily = parseDailyJSONSum("moderately_active_minutes", 1);
const veryDaily = parseDailyJSONSum("very_active_minutes", 1);

// Build combined activity intensity map
const activityIntensityMap = {};
sedentaryDaily.forEach((s) => {
  activityIntensityMap[s.date] = { date: s.date, sedentary: Math.round(s.value), lightly: 0, fairly: 0, very: 0 };
});
lightlyDaily.forEach((s) => {
  if (!activityIntensityMap[s.date]) activityIntensityMap[s.date] = { date: s.date, sedentary: 0, lightly: 0, fairly: 0, very: 0 };
  activityIntensityMap[s.date].lightly = Math.round(s.value);
});
moderatelyDaily.forEach((s) => {
  if (!activityIntensityMap[s.date]) activityIntensityMap[s.date] = { date: s.date, sedentary: 0, lightly: 0, fairly: 0, very: 0 };
  activityIntensityMap[s.date].fairly = Math.round(s.value);
});
veryDaily.forEach((s) => {
  if (!activityIntensityMap[s.date]) activityIntensityMap[s.date] = { date: s.date, sedentary: 0, lightly: 0, fairly: 0, very: 0 };
  activityIntensityMap[s.date].very = Math.round(s.value);
});
const dailyActivityIntensity = Object.values(activityIntensityMap).sort((a, b) => a.date.localeCompare(b.date));

// ============ Detailed Sleep Logs & Stages ============
const sleepJSONFiles = readdirSync(globalDir).filter((f) => f.startsWith("sleep-") && f.endsWith(".json"));
const sleepLogs = [];
for (const f of sleepJSONFiles) {
  try {
    const arr = JSON.parse(readFileSync(join(globalDir, f), "utf8"));
    for (const s of arr) {
      if (!s.dateOfSleep) continue;
      const summary = s.levels?.summary || {};
      sleepLogs.push({
        date: s.dateOfSleep,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMin: Math.round((s.duration || 0) / 60000),
        minutesAsleep: s.minutesAsleep || 0,
        minutesAwake: s.minutesAwake || 0,
        efficiency: s.efficiency || 0,
        deepMin: summary.deep?.minutes ?? summary.asleep?.minutes ?? 0,
        remMin: summary.rem?.minutes ?? 0,
        lightMin: summary.light?.minutes ?? summary.restless?.minutes ?? 0,
        wakeMin: summary.wake?.minutes ?? summary.awake?.minutes ?? 0,
      });
    }
  } catch {}
}
sleepLogs.sort((a, b) => a.date.localeCompare(b.date));

// Sleep Score CSV
const sleepCSV = loadCSV("Sleep Score/sleep_score.csv");
const sleepScoreMap = {};
sleepCSV.data.forEach((r) => {
  const d = dateOnly(r.timestamp);
  if (d && num(r.overall_score) !== null) {
    sleepScoreMap[d] = {
      overall: num(r.overall_score),
      deep: num(r.deep_sleep_in_minutes) || 0,
      rhr: num(r.resting_heart_rate) || 0,
    };
  }
});

const sleepSeries = Object.entries(sleepScoreMap)
  .map(([date, obj]) => ({
    date,
    overall: obj.overall,
    deep: obj.deep,
    rhr: obj.rhr,
  }))
  .sort((a, b) => a.date.localeCompare(b.date));

// Merge sleep stages with score
const sleepStagesDetailed = sleepLogs.map((s) => {
  const scoreObj = sleepScoreMap[s.date];
  return {
    ...s,
    score: scoreObj ? scoreObj.overall : null,
    rhr: scoreObj ? scoreObj.rhr : null,
  };
});

// ============ Logged Exercises / Workouts ============
const exerciseFiles = readdirSync(globalDir).filter((f) => f.startsWith("exercise-") && f.endsWith(".json"));
const workouts = [];
for (const f of exerciseFiles) {
  try {
    const arr = JSON.parse(readFileSync(join(globalDir, f), "utf8"));
    for (const ex of arr) {
      if (!ex.startTime) continue;
      let d = "";
      const m = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(ex.startTime);
      if (m) {
        d = `20${m[3]}-${m[1]}-${m[2]}`;
      } else {
        d = dateOnly(ex.startTime);
      }
      workouts.push({
        id: String(ex.logId || Math.random()),
        date: d,
        activityName: ex.activityName || "Workout",
        startTime: ex.startTime,
        durationMin: Math.round((ex.duration || 0) / 60000),
        calories: ex.calories || 0,
        avgHr: ex.averageHeartRate || null,
        steps: ex.steps || 0,
        distanceKm: ex.distance ? +(ex.distance).toFixed(2) : null,
        fatBurnMin: ex.heartRateZones?.find((z) => z.name === "Fat Burn")?.minutes || 0,
        cardioMin: ex.heartRateZones?.find((z) => z.name === "Cardio")?.minutes || 0,
        peakMin: ex.heartRateZones?.find((z) => z.name === "Peak")?.minutes || 0,
        // Swim-specific (25 m pool laps etc.); null for non-swim activities.
        swimLengths: ex.activityName === "Swim" ? (num(ex.swimLengths) ?? null) : null,
        poolLengthM: ex.activityName === "Swim" ? (num(ex.poolLength) ?? null) : null,
        paceSecPerKm: ex.activityName === "Swim" ? (num(ex.pace) ?? null) : null,
        speedKmh: ex.activityName === "Swim" ? (num(ex.speed) ?? null) : null,
      });
    }
  } catch {}
}
workouts.sort((a, b) => b.date.localeCompare(a.date));

// ============ Fitbit Badges ============
let badges = [];
try {
  const badgeFile = join(globalDir, "badge.json");
  if (existsSync(badgeFile)) {
    const badgeArr = JSON.parse(readFileSync(badgeFile, "utf8"));
    badges = badgeArr.map((b) => ({
      id: b.encodedId,
      name: b.name,
      shortName: b.shortName,
      badgeType: b.badgeType,
      value: b.value,
      timesAchieved: b.timesAchieved || 1,
      earnedDate: b.dateTime || "",
      description: b.description || b.earnedMessage || "",
      category: b.category || "General",
    }));
  }
} catch (e) {
  console.warn("Could not load badges:", e.message);
}

// ============ User Profile ============
const profileCSV = loadCSV("Your Profile/Profile.csv");
const userProfile = profileCSV.data.length > 0 ? {
  name: profileCSV.data[0].full_name || "Harendra Singh",
  displayName: profileCSV.data[0].display_name || "Harendra S.",
  email: profileCSV.data[0].email_address || "",
  memberSince: profileCSV.data[0].member_since || "2019-12-27",
  timezone: profileCSV.data[0].timezone || "Asia/Kolkata",
  gender: profileCSV.data[0].gender || "",
  height: profileCSV.data[0].height || "",
  weight: profileCSV.data[0].weight || "",
} : {
  name: "Harendra Singh",
  displayName: "Harendra S.",
  email: "",
  memberSince: "2019-12-27",
  timezone: "Asia/Kolkata",
  gender: "",
  height: "",
  weight: "",
};

// ============ Stress Score ============
const stress = loadCSV("Stress Score/Stress Score.csv");
const stressSeries = stress.data
  .map((r) => ({ date: dateOnly(r.DATE), value: num(r.STRESS_SCORE) }))
  .filter((r) => r.date && r.value !== null)
  .sort((a, b) => a.date.localeCompare(b.date));
const stressStatus = {};
for (const r of stress.data) {
  if (r.STATUS) stressStatus[r.STATUS] = (stressStatus[r.STATUS] || 0) + 1;
}

// ============ Resting HR, HRV, VO2, Resp, SpO2, Temp, Weight, Readiness ============
const rhr = dailySeries("Physical Activity_GoogleData/daily_resting_heart_rate.csv", "beats per minute");
const hrv = dailySeries("Physical Activity_GoogleData/daily_heart_rate_variability.csv", "average heart rate variability milliseconds");
const vo2 = dailySeries("Physical Activity_GoogleData/daily_vo2_max.csv", "daily vo2 max value");
const resp = dailySeries("Physical Activity_GoogleData/daily_respiratory_rate.csv", "breaths per minute");
const spo2 = dailySeries("Physical Activity_GoogleData/daily_oxygen_saturation.csv", "average percentage");
const sleepTemp = dailySeries("Physical Activity_GoogleData/daily_sleep_temperature_derivations.csv", "nightly temperature celsius");
const weight = dailySeries("Physical Activity_GoogleData/weight.csv", "weight grams", {
  transform: (v) => +(v / 1000).toFixed(1),
});
const readiness = loadCSV("Physical Activity_GoogleData/daily_readiness.csv");
const readinessSeries = readiness.data
  .map((r) => ({ date: dateOnly(r.timestamp), value: num(r.score) }))
  .filter((r) => r.date && r.value !== null)
  .sort((a, b) => a.date.localeCompare(b.date));

// ============ Moods ============
const moods = loadCSV("Physical Activity_GoogleData/moods.csv");
const moodCounts = {};
for (const r of moods.data) {
  const m = (r.moods || "").replace(/[\[\]]/g, "");
  if (m) moodCounts[m] = (moodCounts[m] || 0) + 1;
}

// ============ Active Zone Minutes (AZM) ============
const azmDir = join(ROOT, "Active Zone Minutes (AZM)");
const azmMonthly = {};
if (existsSync(azmDir)) {
  for (const f of readdirSync(azmDir)) {
    if (!f.endsWith(".csv")) continue;
    const { data } = loadCSV(`Active Zone Minutes (AZM)/${f}`);
    for (const r of data) {
      const mk = monthlyKey(r.date_time || "");
      if (!mk) continue;
      const zone = r.heart_zone_id;
      const mins = num(r.total_minutes) || 0;
      if (!azmMonthly[mk]) azmMonthly[mk] = { month: mk, FAT_BURN: 0, CARDIO: 0, PEAK: 0 };
      if (zone in azmMonthly[mk]) azmMonthly[mk][zone] += mins;
    }
  }
}
const azmSeries = Object.values(azmMonthly)
  .map((m) => ({
    month: m.month,
    FAT_BURN: Math.round(m.FAT_BURN),
    CARDIO: Math.round(m.CARDIO),
    PEAK: Math.round(m.PEAK),
    total: Math.round(m.FAT_BURN + m.CARDIO + m.PEAK),
  }))
  .sort((a, b) => a.month.localeCompare(b.month));

// Monthly steps & calories
function monthlySumFromDaily(daily) {
  const acc = {};
  for (const item of daily) {
    const mk = item.date.slice(0, 7);
    acc[mk] = (acc[mk] || 0) + item.value;
  }
  return Object.entries(acc)
    .map(([month, total]) => ({ month, total: Math.round(total) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
const stepsMonthly = monthlySumFromDaily(dailyStepsSeries);
const caloriesMonthly = monthlySumFromDaily(dailyCaloriesSeries);

// ============ GPS location, session tracks & Activity Heatmap ============
const gpsDir = join(ROOT, "Physical Activity_GoogleData");
const geoPoints = [];
const geoTracks = []; // per-day movement sessions (start→end routes for animated playback)
const activityHeat = Array.from({ length: 7 }, () => new Array(24).fill(0));

// Session splitting / track building tunables.
const SESSION_GAP_MS = 15 * 60 * 1000; // new session after 15 min without a fix
const MAX_TRACK_POINTS = 200; // downsample cap per session (keeps health.json small)
const MIN_SESSION_FIXES = 8; // ignore tiny blips
const MIN_PATH_M = 100; // ignore stationary noise (unless displaced)
const MIN_DISPLACEMENT_M = 50;

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Workout start epochs (UTC ms) for session labeling. Verified against GPS
// timestamps: Fitbit exercise startTime ("MM/DD/YY HH:MM:SS") is already UTC.
const workoutWindows = [];
for (const w of workouts) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(w.startTime || "");
  if (!m) continue;
  const start = Date.UTC(+`20${m[3]}`, +m[1] - 1, +m[2], +m[4], +m[5], +m[6]);
  workoutWindows.push({ start, end: start + (w.durationMin || 0) * 60000, activityName: w.activityName });
}

function matchWorkoutActivity(sessionStart) {
  let best = null;
  let bestDist = Infinity;
  for (const w of workoutWindows) {
    if (sessionStart >= w.start - 20 * 60000 && sessionStart <= w.end + 20 * 60000) {
      const dist = Math.abs(sessionStart - w.start);
      if (dist < bestDist) {
        bestDist = dist;
        best = w.activityName;
      }
    }
  }
  return best;
}

if (existsSync(gpsDir)) {
  const gpsFiles = readdirSync(gpsDir).filter((f) => f.startsWith("gps_location_") && f.endsWith(".csv"));
  for (const f of gpsFiles) {
    const { data } = loadCSV(`Physical Activity_GoogleData/${f}`);
    if (!data.length) continue;
    let la = 0, lo = 0, al = 0, n = 0;
    const fixes = [];
    for (const r of data) {
      const lat = num(r.latitude);
      const lng = num(r.longitude);
      const alt = num(r.altitude);
      if (lat === null || lng === null) continue;
      la += lat;
      lo += lng;
      if (alt !== null) al += alt;
      n++;
      const t = new Date(r.timestamp).getTime();
      if (Number.isFinite(t)) fixes.push({ t, lat, lng, alt });
      const dt = new Date(r.timestamp);
      const hr = dt.getUTCHours();
      const dow = dt.getUTCDay();
      if (hr >= 0 && hr < 24 && dow >= 0 && dow < 7) activityHeat[dow][hr]++;
    }
    if (n === 0) continue;
    geoPoints.push({
      date: f.replace("gps_location_", "").replace(".csv", ""),
      lat: +(la / n).toFixed(5),
      lng: +(lo / n).toFixed(5),
      alt: n ? +(al / n).toFixed(1) : null,
      count: n,
    });

    // ---- Split the day's fixes into movement sessions ----
    fixes.sort((a, b) => a.t - b.t);
    const sessions = [];
    let current = [];
    for (const fix of fixes) {
      if (current.length && fix.t - current[current.length - 1].t > SESSION_GAP_MS) {
        sessions.push(current);
        current = [];
      }
      current.push(fix);
    }
    if (current.length) sessions.push(current);

    const dayLabel = f.replace("gps_location_", "").replace(".csv", "");
    for (const s of sessions) {
      if (s.length < MIN_SESSION_FIXES) continue;
      let pathM = 0;
      for (let i = 1; i < s.length; i++) {
        pathM += haversineM(s[i - 1].lat, s[i - 1].lng, s[i].lat, s[i].lng);
      }
      const displacementM = haversineM(s[0].lat, s[0].lng, s[s.length - 1].lat, s[s.length - 1].lng);
      if (pathM < MIN_PATH_M && displacementM < MIN_DISPLACEMENT_M) continue;

      // Stride-downsample, always keeping first & last fixes.
      const stride = Math.max(1, Math.ceil(s.length / MAX_TRACK_POINTS));
      const sampled = s.filter((_, i) => i % stride === 0);
      if (sampled[sampled.length - 1] !== s[s.length - 1]) sampled.push(s[s.length - 1]);

      const t0 = s[0].t;
      const tEnd = s[s.length - 1].t;
      geoTracks.push({
        date: dayLabel,
        start: t0,
        end: tEnd,
        activity: matchWorkoutActivity(t0),
        distanceM: Math.round(pathM),
        // [lat, lng, alt, elapsed seconds since session start]
        points: sampled.map((p) => [
          +p.lat.toFixed(5),
          +p.lng.toFixed(5),
          p.alt === null ? null : +p.alt.toFixed(1),
          Math.round((p.t - t0) / 1000),
        ]),
      });
    }
  }
}
geoPoints.sort((a, b) => a.date.localeCompare(b.date));
geoTracks.sort((a, b) => a.start - b.start);

// ============ Elevation ============
const elevByMonth = {};
if (existsSync(globalDir)) {
  const elevFiles = readdirSync(globalDir).filter((f) => f.startsWith("altitude-") && f.endsWith(".json"));
  for (const f of elevFiles) {
    try {
      const arr = JSON.parse(readFileSync(join(globalDir, f), "utf8"));
      for (const item of arr) {
        if (!item.dateTime) continue;
        const m = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(item.dateTime);
        if (!m) continue;
        const mk = `20${m[3]}-${m[1]}`;
        const v = num(item.value);
        if (v === null) continue;
        if (!elevByMonth[mk]) elevByMonth[mk] = { sum: 0, n: 0 };
        elevByMonth[mk].sum += v;
        elevByMonth[mk].n++;
      }
    } catch {}
  }
}
const elevationSeries = Object.entries(elevByMonth)
  .map(([month, o]) => ({ date: month + "-01", value: +(o.sum / o.n).toFixed(1) }))
  .sort((a, b) => a.date.localeCompare(b.date));

// ============ All-Time Personal Records & Milestones ============
function findMax(series) {
  if (!series || !series.length) return null;
  let max = series[0];
  for (const p of series) {
    if (p.value > max.value) max = p;
  }
  return max;
}

function findMin(series) {
  if (!series || !series.length) return null;
  let min = series[0];
  for (const p of series) {
    if (p.value < min.value) min = p;
  }
  return min;
}

// Calculate longest 10k steps streak
let currentStreak = 0;
let maxStreak = 0;
let streakStart = "";
let maxStreakRange = "";
for (let i = 0; i < dailyStepsSeries.length; i++) {
  const p = dailyStepsSeries[i];
  if (p.value >= 10000) {
    if (currentStreak === 0) streakStart = p.date;
    currentStreak++;
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      maxStreakRange = `${streakStart} to ${p.date}`;
    }
  } else {
    currentStreak = 0;
  }
}

const totalLifetimeSteps = dailyStepsSeries.reduce((acc, p) => acc + p.value, 0);
const totalLifetimeDistance = dailyDistanceSeries.reduce((acc, p) => acc + p.value, 0);
const totalLifetimeCalories = dailyCaloriesSeries.reduce((acc, p) => acc + p.value, 0);

const personalRecords = {
  maxStepsDay: findMax(dailyStepsSeries),
  maxCaloriesDay: findMax(dailyCaloriesSeries),
  maxDistanceDay: findMax(dailyDistanceSeries),
  highestSleepScore: findMax(sleepSeries.map((s) => ({ date: s.date, value: s.overall }))),
  lowestRestingHR: findMin(rhr),
  highestHRV: findMax(hrv),
  highestVO2Max: findMax(vo2),
  totalLifetimeSteps: Math.round(totalLifetimeSteps),
  totalLifetimeDistanceKm: +totalLifetimeDistance.toFixed(1),
  totalLifetimeCalories: Math.round(totalLifetimeCalories),
  totalWorkoutsLogged: workouts.length,
  totalDaysTracked: dailyStepsSeries.length,
  longest10kStreakDays: maxStreak,
  longestStreakPeriod: maxStreakRange,
};

// ============ Datasets Assembly ============
const build = (key, label, unit, series, group) => ({
  key,
  label,
  unit,
  group,
  summary: summarize(series),
  series,
});

const datasets = {
  steps: build("steps", "Daily Steps", "steps", dailyStepsSeries, "activity"),
  calories: build("calories", "Daily Calories", "kcal", dailyCaloriesSeries, "activity"),
  distance: build("distance", "Daily Distance", "km", dailyDistanceSeries, "activity"),
  sleepScore: build("sleepScore", "Sleep Score", "score", sleepSeries.map((s) => ({ date: s.date, value: s.overall })), "sleep"),
  sleepDeep: build("sleepDeep", "Deep Sleep", "min", sleepSeries.map((s) => ({ date: s.date, value: s.deep })), "sleep"),
  sleepRhr: build("sleepRhr", "Resting HR (Sleep)", "bpm", sleepSeries.map((s) => ({ date: s.date, value: s.rhr })), "sleep"),
  stressScore: build("stressScore", "Stress Score", "score", stressSeries, "stress"),
  restingHR: build("restingHR", "Resting Heart Rate", "bpm", rhr, "heart"),
  hrv: build("hrv", "Heart Rate Variability", "ms", hrv, "heart"),
  vo2max: build("vo2max", "VO2 Max", "ml/kg/min", vo2, "fitness"),
  respiratory: build("respiratory", "Respiratory Rate", "br/min", resp, "breath"),
  spo2: build("spo2", "Oxygen Saturation", "%", spo2, "breath"),
  sleepTemp: build("sleepTemp", "Skin Temperature", "°C", sleepTemp, "sleep"),
  weight: build("weight", "Weight", "kg", weight, "body"),
  readiness: build("readiness", "Daily Readiness", "score", readinessSeries, "readiness"),
  elevation: build("elevation", "Elevation", "m", elevationSeries, "geo"),
};

const azmFunnel = [
  { stage: "Months tracked", value: azmSeries.length },
  { stage: "Fat burn", value: azmSeries.filter((m) => m.FAT_BURN > 0).length },
  { stage: "Cardio", value: azmSeries.filter((m) => m.CARDIO > 0).length },
  { stage: "Peak", value: azmSeries.filter((m) => m.PEAK > 0).length },
];

const derived = {
  userProfile,
  personalRecords,
  dailyStepsSeries,
  dailyCaloriesSeries,
  dailyDistanceSeries,
  dailyActivityIntensity,
  sleepStagesDetailed,
  sleepSeries,
  workouts,
  badges,
  stressStatus,
  moodCounts,
  azmSeries,
  azmFunnel,
  stepsMonthly,
  caloriesMonthly,
  geoPoints,
  geoTracks,
  activityHeat,
  elevationSeries,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify({ datasets, derived }, null, 0));

console.log("✓ Successfully generated health.json");
console.log("Daily steps points:", dailyStepsSeries.length);
console.log("Daily calories points:", dailyCaloriesSeries.length);
console.log("Daily distance points:", dailyDistanceSeries.length);
console.log("Workouts logged:", workouts.length);
console.log("Sleep logs:", sleepLogs.length);
console.log("Badges earned:", badges.length);
console.log("GPS sessions tracked:", geoTracks.length);
console.log("Max steps day:", personalRecords.maxStepsDay);
console.log("Longest 10k streak:", personalRecords.longest10kStreakDays, "days (", personalRecords.longestStreakPeriod, ")");
