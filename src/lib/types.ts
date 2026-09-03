export interface SeriesPoint {
  date: string;
  value: number;
}

export interface DatasetSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
  firstDate: string;
  lastDate: string;
  trendPct: number;
}

export interface Dataset {
  key: string;
  label: string;
  unit: string;
  group: string;
  summary: DatasetSummary | null;
  series: SeriesPoint[];
}

// `type` (not `interface`) so monthly rows satisfy chart index signatures.
export type AZMPoint = {
  month: string;
  FAT_BURN: number;
  CARDIO: number;
  PEAK: number;
  total: number;
};

// `type` (not `interface`) so log rows satisfy table index signatures.
export type SleepStageLog = {
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  minutesAsleep: number;
  minutesAwake: number;
  efficiency: number;
  deepMin: number;
  remMin: number;
  lightMin: number;
  wakeMin: number;
  score: number | null;
  rhr: number | null;
};

export interface WorkoutLog {
  id: string;
  date: string;
  activityName: string;
  startTime: string;
  durationMin: number;
  calories: number;
  avgHr: number | null;
  steps: number;
  distanceKm: number | null;
  fatBurnMin: number;
  cardioMin: number;
  peakMin: number;
}

export interface ActivityIntensityPoint {
  date: string;
  sedentary: number;
  lightly: number;
  fairly: number;
  very: number;
}

export interface BadgeItem {
  id: string;
  name: string;
  shortName: string;
  badgeType: string;
  value: number;
  timesAchieved: number;
  earnedDate: string;
  description: string;
  category: string;
}

export interface UserProfile {
  name: string;
  displayName: string;
  email: string;
  memberSince: string;
  timezone: string;
  gender: string;
  height: string;
  weight: string;
}

export interface PersonalRecords {
  maxStepsDay: SeriesPoint | null;
  maxCaloriesDay: SeriesPoint | null;
  maxDistanceDay: SeriesPoint | null;
  highestSleepScore: SeriesPoint | null;
  lowestRestingHR: SeriesPoint | null;
  highestHRV: SeriesPoint | null;
  highestVO2Max: SeriesPoint | null;
  totalLifetimeSteps: number;
  totalLifetimeDistanceKm: number;
  totalLifetimeCalories: number;
  totalWorkoutsLogged: number;
  totalDaysTracked: number;
  longest10kStreakDays: number;
  longestStreakPeriod: string;
}

export interface GeoPoint {
  date: string;
  lat: number;
  lng: number;
  alt: number | null;
  count: number;
}

/** Single movement session: ordered [lat, lng, alt, elapsedSec] fixes. */
export interface GeoTrackSession {
  date: string;
  /** UTC epoch ms of first fix. */
  start: number;
  /** UTC epoch ms of last fix. */
  end: number;
  /** Matched workout activity name, if any. */
  activity: string | null;
  /** Total path length in meters. */
  distanceM: number;
  points: [number, number, number | null, number][];
}

export interface HealthData {
  datasets: Record<string, Dataset>;
  derived: {
    userProfile: UserProfile;
    personalRecords: PersonalRecords;
    dailyStepsSeries: SeriesPoint[];
    dailyCaloriesSeries: SeriesPoint[];
    dailyDistanceSeries: SeriesPoint[];
    dailyActivityIntensity: ActivityIntensityPoint[];
    sleepStagesDetailed: SleepStageLog[];
    sleepSeries: { date: string; overall: number; deep: number; rhr: number }[];
    workouts: WorkoutLog[];
    badges: BadgeItem[];
    stressStatus: Record<string, number>;
    moodCounts: Record<string, number>;
    azmSeries: AZMPoint[];
    azmFunnel: { stage: string; value: number }[];
    stepsMonthly: { month: string; total: number }[];
    caloriesMonthly: { month: string; total: number }[];
    geoPoints: GeoPoint[];
    geoTracks: GeoTrackSession[];
    activityHeat: number[][];
    elevationSeries: { date: string; value: number }[];
  };
}
