import { describe, expect, it } from "vitest";
import { addRepeatingTask, makeDay, repeatDates, type RepeatPlan } from "@/lib/mizan";
const plan: RepeatPlan = { task: { id: "reading", name: "Read Quran", from: "08:00", to: "09:00", countTo: 0, count: 0, done: true }, startMonth: "2026-11", endMonth: "2026-12", frequency: "daily" };
describe("Repeating monthly targets", () => {
  it("includes every day across both targeted months and stops at the boundary", () => {
    const dates = repeatDates(plan);
    expect(dates).toHaveLength(61);
    expect(dates[0]).toBe("2026-11-01");
    expect(dates.at(-1)).toBe("2026-12-31");
    expect(dates).not.toContain("2027-01-01");
  });
  it("weekday plans exclude Saturdays and Sundays", () => {
    const dates = repeatDates({ ...plan, endMonth: "2026-11", frequency: "weekdays" });
    expect(dates).toHaveLength(21);
    expect(dates).toContain("2026-11-02");
    expect(dates).not.toContain("2026-11-01");
    expect(dates).not.toContain("2026-11-07");
  });
  it("preserves existing records and never carries completion into another day", () => {
    const base = makeDay(true);
    const updated = addRepeatingTask(base, plan.task, "2026-11-24");
    expect(updated.prayers).toEqual(base.prayers);
    expect(updated.tasks.slice(0, base.tasks.length)).toEqual(base.tasks);
    expect(updated.tasks.at(-1)).toMatchObject({ id: "reading:2026-11-24", done: false, count: 0 });
    expect(addRepeatingTask(updated, plan.task, "2026-11-24").tasks).toHaveLength(updated.tasks.length);
  });
  it("rejects reversed month ranges", () => {
    expect(() => repeatDates({ ...plan, startMonth: "2026-12", endMonth: "2026-11" })).toThrow();
  });
  it("rejects ranges exceeding ten years", () => {
    expect(() => repeatDates({ ...plan, startMonth: "2026-01", endMonth: "2036-01" })).toThrow();
    expect(repeatDates({ ...plan, startMonth: "2026-01", endMonth: "2035-12" }).at(-1)).toBe("2035-12-31");
  });
  it("rejects an end time earlier than the start time", () => {
    expect(() => repeatDates({ ...plan, task: { ...plan.task, from: "09:00", to: "08:00" } })).toThrow();
  });
});