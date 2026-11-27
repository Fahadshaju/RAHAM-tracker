import { describe, expect, it } from "vitest";
import { forestLevel, gardenStreak, unlocked, isFree, freeSpot, growth } from "@/lib/garden";

describe("garden rules", () => {
  it("forest tiers at 1, 10, 50, 100 trees", () => {
    expect(forestLevel(0)).toBe(0);
    expect(forestLevel(1)).toBe(1);
    expect(forestLevel(9)).toBe(1);
    expect(forestLevel(10)).toBe(2);
    expect(forestLevel(50)).toBe(3);
    expect(forestLevel(100)).toBe(4);
  });
  it("streak counts consecutive days and breaks on a gap", () => {
    expect(gardenStreak(["2026-11-21", "2026-11-22", "2026-11-23"], "2026-11-23")).toBe(3);
    expect(gardenStreak(["2026-11-21", "2026-11-22"], "2026-11-23")).toBe(2);
    expect(gardenStreak(["2026-11-20", "2026-11-23"], "2026-11-23")).toBe(1);
  });
  it("streak of 7 days unlocks the fountain (3 upgrades)", () => {
    expect(unlocked(7)).toBe(3);
    expect(unlocked(30)).toBe(5);
  });
  it("trees never land in the river or on each other", () => {
    expect(isFree(0, 1.5, [])).toBe(false);
    const t = { id: "a", x: 4, z: -4, plantedAt: 0, seed: 1 };
    expect(isFree(4.2, -4, [t])).toBe(false);
    const spot = freeSpot([]);
    expect(spot && isFree(spot.x, spot.z, [])).toBe(true);
  });
  it("sapling grows to near full in 3 seconds", () => {
    expect(growth(0, 0).scale).toBeCloseTo(0.15);
    expect(growth(0, 3000).scale).toBeCloseTo(0.75);
  });
});

import { dayGardenPoints, journalGarden, prayerGrowthDays } from "@/lib/garden";
import { makeDay } from "@/lib/mizan";
describe("journal garden", () => {
  const day = (on: number, missed: number, tasks: number) => {
    const d = makeDay();
    d.prayers = d.prayers.map((p, i) => ({ ...p, status: i < on ? "On time" : i < on + missed ? "Missed" : "Pending" }));
    d.tasks = Array.from({ length: tasks }, (_, i) => ({ id: `${i}`, name: "t", from: "08:00", to: "09:00", done: true, count: 0, countTo: 0 }));
    return d;
  };
  it("6 prayers and 10 targets give 16 points; extra targets don't count", () => {
    expect(dayGardenPoints(day(6, 0, 10))).toBe(16);
    expect(dayGardenPoints(day(6, 0, 14))).toBe(16);
  });
  it("each missed prayer takes 2 points and withers without deleting earned trees", () => {
    const g = journalGarden({ "2026-11-22": day(6, 0, 4), "2026-11-23": day(2, 4, 0) }, "2026-11-23");
    expect(g.todayPoints).toBe(-6);
    expect(g.trees).toBe(10);
    expect(g.withered).toBe(true);
  });
  it("keeps seven earned garden points through later blank and missed days", () => {
    const history = {
      "2026-11-22": day(6, 0, 1),
      "2026-11-23": makeDay(),
      "2026-11-24": day(0, 6, 0),
    };
    const g = journalGarden(history, "2026-11-24");
    expect(g.trees).toBe(7);
    expect(g.todayPoints).toBe(-12);
    expect(g.withered).toBe(true);
  });
  it("uses all positive days for permanent scenery upgrades", () => {
    const history = {
      "2026-11-22": day(6, 0, 0),
      "2026-11-23": day(0, 6, 0),
      "2026-11-24": day(6, 0, 0),
      "2026-11-25": day(6, 0, 0),
    };
    const g = journalGarden(history, "2026-11-25");
    expect(g.growthDays).toBe(3);
    expect(unlocked(g.growthDays)).toBe(2);
  });
  it("keeps the seven-day Heaven stage after blank and missed days", () => {
    const history: Record<string, ReturnType<typeof day>> = {};
    for (let i = 1; i <= 7; i++) history[`2026-11-0${i}`] = day(6, 0, 0);
    history["2026-11-08"] = makeDay();
    history["2026-11-09"] = day(0, 6, 0);
    expect(prayerGrowthDays(history, "2026-11-09", false)).toBe(7);
    expect(heavenTier(prayerGrowthDays(history, "2026-11-09", false))).toBe(2);
    history["2026-11-10"] = day(6, 0, 0);
    expect(prayerGrowthDays(history, "2026-11-10", false)).toBe(8);
  });
});

import { heavenTier, nextHeavenTier, heavenTierName } from "@/lib/garden";
describe("heaven progression", () => {
  it("unlocks tiers at 3, 7, 14, 30, 60 prayer-streak days", () => {
    expect(heavenTier(0)).toBe(0);
    expect(heavenTier(2)).toBe(0);
    expect(heavenTier(3)).toBe(1);
    expect(heavenTier(7)).toBe(2);
    expect(heavenTier(14)).toBe(3);
    expect(heavenTier(30)).toBe(4);
    expect(heavenTier(60)).toBe(5);
    expect(nextHeavenTier(5)).toEqual({ name: "Fruit gardens", inDays: 2 });
    expect(heavenTier(90)).toBe(6);
    expect(heavenTier(365)).toBe(8);
    expect(heavenTier(3650)).toBe(12);
    expect(heavenTier(3650 + 365)).toBe(13);
    expect(heavenTierName(13)).toBe("Eternal horizon 2");
    expect(nextHeavenTier(60)).toEqual({ name: "Angels of light", inDays: 30 });
    expect(nextHeavenTier(3650)).toEqual({ name: "Eternal horizon 2", inDays: 365 });
  });
  it("reaches the fully detailed stage at ten years, not twenty", () => {
    expect(heavenTierName(heavenTier(3650 - 1))).toBe("Celestial realm");
    expect(heavenTierName(heavenTier(10 * 365))).toBe("Eternal horizon");
    expect(heavenTier(100 * 365)).toBe(102);
  });
});
