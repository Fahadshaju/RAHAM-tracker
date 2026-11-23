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

import { dayGardenPoints, journalGarden } from "@/lib/garden";
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
  it("each missed prayer takes 2 points and withers the garden", () => {
    const g = journalGarden({ "2026-11-22": day(6, 0, 4), "2026-11-23": day(2, 4, 0) }, "2026-11-23");
    expect(g.todayPoints).toBe(-6);
    expect(g.trees).toBe(4);
    expect(g.withered).toBe(true);
  });
});
