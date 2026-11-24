import { describe, expect, it } from "vitest";
import { makeDay, taskPoints, type Task } from "@/lib/mizan";
import { dayGardenPoints } from "@/lib/garden";

const target: Task = { id: "istighfar", name: "Istighfar", from: "20:00", to: "21:00", done: false, count: 0, countTo: 1000 };

describe("Target marks", () => {
  it("awards +1 when a fixed-count target reaches its count", () => {
    expect(taskPoints({ ...target, count: 1000 })).toBe(1);
  });

  it("awards −1 only when a target is explicitly marked missed", () => {
    expect(taskPoints({ ...target, missed: true })).toBe(-1);
  });

  it("awards 0 while a target is still open", () => {
    expect(taskPoints({ ...target, count: 420 })).toBe(0);
  });

  it("subtracts a missed target from the garden", () => {
    const day = makeDay();
    day.tasks = [{ ...target, missed: true }];
    expect(dayGardenPoints(day)).toBe(-1);
  });
});
