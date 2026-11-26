import { describe, expect, it } from "vitest";
import { commitmentPoints, makeDay, scoreDay } from "@/lib/mizan";
import { dayGardenPoints, hellDepth, journalGarden } from "@/lib/garden";

describe("shared daily commitment scoring", () => {
  it.each(Array.from({ length: 8 }, (_, index) => index))("adds +5 for kept Nafs habit %i to commitments and the garden", (index) => {
    const day = makeDay();
    day.guardrails[index] = true;
    expect(commitmentPoints(day)).toBe(5);
    expect(scoreDay(day).commitmentPoints).toBe(5);
    expect(scoreDay(day).points).toBe(5);
    expect(scoreDay(day).pillars.purity).toBe(0.125);
    expect(dayGardenPoints(day)).toBe(5);
  });

  it.each(Array.from({ length: 8 }, (_, index) => index))("subtracts 5 for missed Nafs habit %i from commitments and the garden", (index) => {
    const day = makeDay();
    day.guardrails[index] = false;
    expect(commitmentPoints(day)).toBe(-5);
    expect(scoreDay(day).points).toBe(-5);
    expect(scoreDay(day).pillars.purity).toBe(0);
    expect(dayGardenPoints(day)).toBe(-5);
    const history = { "2026-11-24": day };
    expect(journalGarden(history, "2026-11-24").withered).toBe(true);
    expect(hellDepth(history, "2026-11-24")).toBe(1);
  });

  it("adds must-follow rule points once in Balance and Heaven & Hell", () => {
    const day = makeDay();
    day.guardrails[0] = true;
    day.musts = Array.from({ length: 5 }, (_, i) => ({ name: `Rule ${i + 1}`, kept: true }));
    expect(commitmentPoints(day)).toBe(30);
    expect(scoreDay(day).points).toBe(30);
    expect(scoreDay(day).pillars.purity).toBeCloseTo(30 / 65);
    expect(dayGardenPoints(day)).toBe(30);
    day.musts[0] = { name: "Rule 1", kept: false };
    expect(commitmentPoints(day)).toBe(20);
    expect(dayGardenPoints(day)).toBe(20);
  });

  it("keeps the commitments share at 35% and a full day at 10", () => {
    const day = makeDay();
    day.tasks = [{ id: "t", name: "Target", from: "08:00", to: "09:00", done: true, count: 0, countTo: 0 }];
    day.prayers = day.prayers.map((prayer) => ({ ...prayer, status: "On time" }));
    day.guardrails = day.guardrails.map(() => true);
    expect(scoreDay(day).weights).toEqual({ prayers: 0.5, purity: 0.35, targets: 0.15 });
    expect(scoreDay(day).score).toBe(10);
    expect(dayGardenPoints(day)).toBe(47);
  });

  it("leaves unlogged habits neutral on the next day without re-awarding history", () => {
    const yesterday = makeDay();
    yesterday.guardrails = yesterday.guardrails.map(() => true);
    const today = makeDay();
    expect(commitmentPoints(today)).toBe(0);
    expect(dayGardenPoints(today)).toBe(0);
    expect(journalGarden({ "2026-11-23": yesterday, "2026-11-24": today }, "2026-11-24")).toMatchObject({ trees: 40, todayPoints: 0, withered: false });
  });
});
describe("prayer times carry forward", () => {
  it("a fresh day takes the latest earlier day's prayer times", async () => {
    const { carryPrayerTimes } = await import("@/lib/mizan");
    const prev = makeDay();
    prev.prayers[1]!.time = "05:30";
    expect(carryPrayerTimes(makeDay(), { "2026-11-24": prev }, "2026-11-25").prayers[1]!.time).toBe("05:30");
  });
});
describe("prayer times skip untouched days", () => {
  it("ignores an earlier day that only holds default times", async () => {
    const { carryPrayerTimes } = await import("@/lib/mizan");
    const set = makeDay();
    set.prayers[1]!.time = "05:30";
    expect(carryPrayerTimes(makeDay(), { "2026-11-23": set, "2026-11-24": makeDay() }, "2026-11-25").prayers[1]!.time).toBe("05:30");
  });
});
describe("prayer times never reset on a new day", () => {
  it("carries times even when the new day already has prayer statuses marked", async () => {
    const { carryPrayerTimes } = await import("@/lib/mizan");
    const set = makeDay();
    set.prayers[1]!.time = "05:30";
    const today = makeDay();
    today.prayers[2]!.status = "On time";
    expect(carryPrayerTimes(today, { "2026-11-24": set }, "2026-11-25").prayers[1]!.time).toBe("05:30");
  });
  it("treats a time saved by the older editor as the chosen time", async () => {
    const { carryPrayerTimes } = await import("@/lib/mizan");
    const old = makeDay();
    old.prayers[1]!.loggedAt = "05:45";
    expect(carryPrayerTimes(makeDay(), { "2026-11-24": old }, "2026-11-25").prayers[1]!.time).toBe("05:45");
  });
  it("keeps a day's own times instead of copying older ones", async () => {
    const { carryPrayerTimes } = await import("@/lib/mizan");
    const older = makeDay();
    older.prayers[1]!.time = "05:30";
    const own = makeDay();
    own.prayers[3]!.time = "16:10";
    const result = carryPrayerTimes(own, { "2026-11-24": older }, "2026-11-25");
    expect(result.prayers[3]!.time).toBe("16:10");
    expect(result.prayers[1]!.time).toBe(makeDay().prayers[1]!.time);
  });
});
