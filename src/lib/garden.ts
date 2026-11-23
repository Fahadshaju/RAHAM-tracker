// Garden rules: plain TypeScript (no React / three.js) so they are easy to test.

export type GardenTask = { id: string; text: string; done: boolean };
export type GardenTree = { id: string; x: number; z: number; plantedAt: number; seed: number };
export type GardenState = { tasks: GardenTask[]; trees: GardenTree[]; days: string[] };

/** Half-width of the square garden box (land runs from -HALF to +HALF). */
export const HALF = 6;
/** Forest tiers: reaching each tree count is a level-up. */
export const TIERS = [1, 10, 50, 100] as const;
/** Streak upgrades: days in a row with at least one finished task unlock new parts of paradise. */
export const UPGRADES = [
  { days: 1, name: "Meadow of flowers" },
  { days: 3, name: "River of clear water" },
  { days: 7, name: "Marble fountain" },
  { days: 14, name: "White pavilion" },
  { days: 30, name: "Light of the garden" },
] as const;
export const GROW_MS = 3000;
export const MAX_TREES = 300;

export function forestLevel(trees: number) {
  return TIERS.filter((t) => trees >= t).length;
}

/** Centre line of the river, a gentle S-curve across the box. */
export function riverZ(x: number) {
  return Math.sin(x * 0.5) * 1.2 + 1.5;
}

/** Can a tree stand here? Not in the river, the pavilion/fountain plaza, the edge, or on another tree. */
export function isFree(x: number, z: number, trees: GardenTree[]) {
  if (Math.abs(x) > HALF - 0.5 || Math.abs(z) > HALF - 0.5) return false;
  if (Math.abs(z - riverZ(x)) < 1.1) return false;
  if (Math.hypot(x + 2.5, z + 2.5) < 2.2) return false; // pavilion
  if (Math.hypot(x - 2.2, z + 1.8) < 1.4) return false; // fountain
  return trees.every((t) => Math.hypot(t.x - x, t.z - z) >= 0.75);
}

/** Random free spot; returns null when the land is full. */
export function freeSpot(trees: GardenTree[], rand = Math.random) {
  for (let i = 0; i < 400; i++) {
    const x = (rand() * 2 - 1) * HALF;
    const z = (rand() * 2 - 1) * HALF;
    if (isFree(x, z, trees)) return { x, z };
  }
  return null;
}

/** Growth 0..1 over GROW_MS (eased), then maturity 0..1 over the next two minutes. */
export function growth(plantedAt: number, now: number) {
  const g = Math.min(1, Math.max(0, (now - plantedAt) / GROW_MS));
  const eased = 1 - Math.pow(1 - g, 3);
  const mature = Math.min(1, Math.max(0, (now - plantedAt - GROW_MS) / 120000));
  return { scale: 0.15 + eased * 0.6 + mature * 0.25, mature };
}

function shift(date: string, by: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

/** Days in a row (ending today, or yesterday if today isn't done yet) with a finished task. */
export function gardenStreak(days: string[], today: string) {
  const set = new Set(days);
  let day = set.has(today) ? today : shift(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = shift(day, -1);
  }
  return n;
}

export function unlocked(streakDays: number) {
  return UPGRADES.filter((u) => streakDays >= u.days).length;
}

// ── Journal-driven garden: the 6 prayers and up to 10 targets of each day grow (or wither) the box. ──
import { taskIsDone, type Day } from "@/lib/mizan";

export const GARDEN_TASK_CAP = 10;
/** +1 per prayer prayed (on time or late), −2 per missed prayer, +1 per finished target (max 10). */
export function dayGardenPoints(day: Day) {
  let pts = 0;
  for (const p of day.prayers) {
    if (p.status === "On time" || p.status === "Late") pts += 1;
    else if (p.status === "Missed") pts -= 2;
  }
  pts += Math.min(GARDEN_TASK_CAP, day.tasks.filter(taskIsDone).length);
  return pts;
}

/** Whole-history summary: trees = running total (never below 0), withered when today or the total is negative. */
export function journalGarden(history: Record<string, Day>, today: string) {
  const dates = Object.keys(history).sort();
  let total = 0;
  const goodDays: string[] = [];
  for (const d of dates) {
    const p = dayGardenPoints(history[d]!);
    total = Math.max(0, total + p);
    if (p > 0) goodDays.push(d);
  }
  const todayPoints = history[today] ? dayGardenPoints(history[today]) : 0;
  return {
    trees: Math.min(MAX_TREES, total),
    todayPoints,
    streak: gardenStreak(goodDays, today),
    withered: todayPoints < 0,
  };
}
