import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Analytics } from "@/components/mizan/analytics";
import { makeDay } from "@/lib/mizan";

const DATE = "2026-11-23";

function yearPanel() {
  const panel = screen.getByText("A year of returning").closest("section");
  if (!panel) throw new Error("year panel not rendered");
  return panel;
}

function labels() {
  return Array.from(yearPanel().querySelectorAll<HTMLElement>(".year-months span")).map((el) => ({
    text: el.textContent ?? "",
    col: Number(el.style.gridColumnStart),
  }));
}

describe("A year of returning", () => {
  it("names the months of the window without any name running into the next", () => {
    render(<Analytics history={{}} date={DATE} sample={false} />);

    const marks = labels();
    const texts = marks.map((m) => m.text);

    // 2025-11-24 .. 2026-11-23: Dec 2025 starts only one column after Nov,
    // so it is left out rather than overlapping, and every name keeps its room.
    expect(texts[0]).toBe("Nov 2025");
    expect(texts).toContain("Jan 2026");
    expect(texts.at(-1)).toBe("Nov");
    expect(texts).toHaveLength(12);
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i]!.col - marks[i - 1]!.col).toBeGreaterThanOrEqual(4);
    }
  });

  it("marks only logged days and leaves every other day unshaded", () => {
    render(<Analytics history={{ "2026-11-20": makeDay(true) }} date={DATE} sample={false} />);

    const cells = yearPanel().querySelectorAll(".year-grid .heatmap-cell");
    const unshaded = yearPanel().querySelectorAll('.year-grid .heatmap-cell[data-level="0"]');

    expect(cells).toHaveLength(365);
    expect(unshaded).toHaveLength(364);
  });
});
