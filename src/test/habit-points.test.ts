import { describe, expect, it } from "vitest";
import { habitPoints } from "@/lib/mizan";
const d = (g: boolean | null) => ({ guardrails: [g] }) as never;
describe("habit points", () => {
  it("earns 10 points per kept day", () => {
    expect(habitPoints({ "2026-11-21": d(true), "2026-11-22": d(true), "2026-11-23": d(true) }, 0, "2026-11-23")).toBe(30);
  });
  it("loses all points when the habit is broken", () => {
    expect(habitPoints({ "2026-11-21": d(true), "2026-11-22": d(true), "2026-11-23": d(false) }, 0, "2026-11-23")).toBe(0);
  });
});
import { badgeProgress } from "@/lib/mizan";
describe("milestone badges", () => {
  it("unlocks First Steps at 50 points and keeps it after a break", () => {
    const h: Record<string, never> = {};
    for (let i = 1; i <= 5; i++) h[`2026-11-0${i}`] = d(true);
    h["2026-11-06"] = d(false);
    const b = badgeProgress(h, "2026-11-06", 1);
    expect(b.total).toBe(50);
    expect(b.earned.map((x) => x.name)).toEqual(["First Steps"]);
    expect(b.next?.points).toBe(150);
  });
});
