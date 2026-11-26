import { afterEach, describe, expect, it, vi } from "vitest";
import { carryPrayerTimes, dateKey, makeDay } from "@/lib/mizan";

afterEach(() => vi.useRealTimers());

describe("custom prayer times across midnight", () => {
  it("keeps every custom prayer time unchanged on the day after midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 23, 59, 30));
    const before = dateKey();
    const custom = ["03:50", "05:10", "12:40", "16:05", "18:20", "19:45"];
    const saved = makeDay();
    saved.prayers = saved.prayers.map((p, i) => ({ ...p, time: custom[i] ?? p.time, status: "On time" }));

    vi.setSystemTime(new Date(2026, 10, 26, 0, 0, 30));
    const after = dateKey();
    expect(after).not.toBe(before);

    const nextDay = carryPrayerTimes(makeDay(), { [before]: saved }, after);
    expect(nextDay.prayers.map((p) => p.time)).toEqual(saved.prayers.map((p) => p.time));
    expect(nextDay.prayers.every((p) => p.status === "Pending")).toBe(true);
  });
});
