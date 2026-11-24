import { describe, expect, it } from "vitest";
import {
  calendarICS,
  daySchema,
  guardrailPoints,
  makeDay,
  parseYouTube,
  prayerPoints,
  scoreDay,
  streak,
  type Day,
} from "@/lib/mizan";
describe("Prayer points", () => {
  it("awards 15 for on-time Fajr", () => {
    expect(
      prayerPoints({ name: "Fajr", time: "05:00", status: "On time", loggedAt: "05:00" }),
    ).toBe(15);
  });
  it("awards 15 for on-time Tahajjud", () => {
    expect(
      prayerPoints({ name: "Tahajjud", time: "04:00", status: "On time", loggedAt: "04:00" }),
    ).toBe(15);
  });
  it("awards 10 for another on-time prayer", () => {
    expect(
      prayerPoints({ name: "Dhuhr", time: "12:00", status: "On time", loggedAt: "12:00" }),
    ).toBe(10);
  });
  it("awards 4 for a late prayer", () => {
    expect(prayerPoints({ name: "Fajr", time: "05:00", status: "Late", loggedAt: "07:00" })).toBe(
      4,
    );
  });
  it("subtracts 12 for a missed prayer", () => {
    expect(prayerPoints({ name: "Asr", time: "15:00", status: "Missed", loggedAt: "" })).toBe(-12);
  });
});
describe("Discipline points", () => {
  it("awards 5 for a kept guardrail", () => expect(guardrailPoints(true)).toBe(5));
  it("subtracts 5 for a missed habit", () => expect(guardrailPoints(false)).toBe(-5));
  it("awards no points to an unlogged commitment", () => expect(guardrailPoints(null)).toBe(0));
  it("resets a streak on relapse and preserves the best", () => {
    const day = makeDay();
    day.guardrails[1] = true;
    const relapse = makeDay();
    relapse.guardrails[1] = false;
    expect(
      streak({ "2026-11-21": day, "2026-11-22": day, "2026-11-23": relapse }, 1, "2026-11-23"),
    ).toEqual({ current: 0, longest: 2 });
  });
  it("does not join streaks across missing days", () => {
    const day = makeDay();
    day.guardrails[0] = true;
    expect(streak({ "2026-11-20": day, "2026-11-23": day }, 0, "2026-11-23")).toEqual({
      current: 1,
      longest: 1,
    });
  });
});
describe("Balance weights", () => {
  const withTasks = (day: Day, n: number, doneCount: number) => {
    day.tasks = Array.from({ length: n }, (_, i) => ({
      id: `t${i}`,
      name: `Target ${i + 1}`,
      from: "08:00",
      to: "09:00",
      done: i < doneCount,
      count: 0,
      countTo: 0,
    }));
    return day;
  };
  it("weights prayers at 50 percent on its own", () => {
    const day = makeDay();
    day.prayers = day.prayers.map((p) => ({ ...p, status: "On time" }));
    withTasks(day, 4, 0);
    expect(scoreDay(day).score).toBe(5);
  });
  it("weights commitments at 35 percent on its own", () => {
    const day = makeDay();
    day.guardrails = day.guardrails.map(() => true);
    withTasks(day, 4, 0);
    expect(scoreDay(day).score).toBe(3.5);
  });
  it("weights finished targets at 15 percent", () => {
    const day = makeDay();
    withTasks(day, 4, 2);
    expect(scoreDay(day).score).toBe(0.8);
  });
  it("shares the target share when no targets are set yet", () => {
    const day = makeDay();
    day.prayers = day.prayers.map((p) => ({ ...p, status: "On time" }));
    expect(scoreDay(day).score).toBe(5.9);
  });
  it("finishes a numbered target only when the count reaches the number", () => {
    const day = makeDay();
    day.tasks = [
      {
        id: "n1",
        name: "Istighfar",
        from: "08:00",
        to: "09:00",
        done: false,
        count: 420,
        countTo: 1000,
      },
    ];
    expect(scoreDay(day).tasksDone).toBe(0);
    day.tasks[0] = { ...day.tasks[0]!, count: 1000 };
    expect(scoreDay(day).tasksDone).toBe(1);
  });
  it("accepts a target with no number, finished by ticking", () => {
    const day = makeDay();
    day.tasks = [
      { id: "t1", name: "Walk", from: "07:00", to: "07:30", done: false, count: 0, countTo: 0 },
    ];
    expect(daySchema.safeParse(day).success).toBe(true);
    expect(scoreDay(day).tasksDone).toBe(0);
  });
  it("keeps a complete day at ten even above targets", () => {
    const day = makeDay();
    day.prayers = day.prayers.map((p) => ({ ...p, status: "On time" }));
    day.guardrails = day.guardrails.map(() => true);
    withTasks(day, 3, 3);
    day.workMinutes = 400;
    day.istighfar = 2100;
    day.exerciseMinutes = 60;
    expect(scoreDay(day).score).toBe(10);
  });
  it("floors negative points at zero", () => {
    const day = makeDay();
    day.prayers = day.prayers.map((p) => ({ ...p, status: "Missed" }));
    day.guardrails = day.guardrails.map(() => false);
    expect(scoreDay(day).score).toBe(0);
  });
  it("requires an istighfar target of at least 1000", () => {
    expect(daySchema.safeParse({ ...makeDay(), target: 999 }).success).toBe(false);
  });
});
describe("Learning and calendar", () => {
  it("prioritizes the whole playlist over a selected video", () => {
    expect(parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123abc")).toEqual({
      playlist: "PL123abc",
      video: null,
    });
  });
  it("rejects other hosts", () =>
    expect(() => parseYouTube("https://evil.example/watch?v=dQw4w9WgXcQ")).toThrow());
  it("exports daily sacred blocks and handles midnight", () => {
    const text = calendarICS([{ name: "Deep work", time: "23:00", minutes: 120 }], "2026-11-23");
    expect(text).toContain("RRULE:FREQ=DAILY");
    expect(text).toContain("DTSTART:20261123T230000");
    expect(text).toContain("DTEND:20261124T010000");
  });
});

import { prayerStreak } from "@/lib/mizan";
describe("Prayer streak", () => {
  const prayed = (skipTahajjud: boolean) => {
    const d = makeDay();
    d.prayers = d.prayers.map((p) => ({
      ...p,
      status: skipTahajjud && p.name === "Tahajjud" ? "Pending" : "On time",
    }));
    return d;
  };
  it("counts 5 obligatory prayers without Tahajjud", () => {
    const h = { "2026-11-22": prayed(true), "2026-11-23": prayed(true) };
    expect(prayerStreak(h, "2026-11-23", false).current).toBe(2);
  });
  it("resets when Tahajjud is required but skipped", () => {
    const h = { "2026-11-22": prayed(true), "2026-11-23": prayed(true) };
    expect(prayerStreak(h, "2026-11-23", true).current).toBe(0);
  });
  it("restarts from zero after a missed obligatory prayer", () => {
    const missed = prayed(false);
    missed.prayers[2] = { ...missed.prayers[2]!, status: "Missed" };
    const h = { "2026-11-21": prayed(false), "2026-11-22": missed, "2026-11-23": prayed(false) };
    expect(prayerStreak(h, "2026-11-23", false)).toEqual({ current: 1, longest: 1 });
  });
});

describe("Quran read habit", () => {
  it("pads days saved with 7 habits to include Quran read as unlogged", async () => {
    
    const old = { ...makeDay(false), guardrails: [true, true, true, true, true, true, true] };
    expect(daySchema.parse(old).guardrails).toEqual([true, true, true, true, true, true, true, null]);
  });
});
