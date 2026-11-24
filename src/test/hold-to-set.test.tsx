import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HoldToSet } from "@/components/mizan/hold-to-set";

function Example({ onHold }: { onHold: () => void }) {
  return (
    <HoldToSet className="row" label="Istighfar target" onHold={onHold}>
      <span>Istighfar</span>
      <input aria-label="Completed amount" />
    </HoldToSet>
  );
}

afterEach(() => vi.useRealTimers());

describe("Hold to set", () => {
  it("opens only after the row is held for 550 milliseconds", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    render(<Example onHold={onHold} />);
    const row = screen.getByRole("group", { name: "Istighfar target" });
    fireEvent(row, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    act(() => vi.advanceTimersByTime(549));
    expect(onHold).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it("cancels a short press and ignores holds on form fields", () => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    render(<Example onHold={onHold} />);
    const row = screen.getByRole("group", { name: "Istighfar target" });
    fireEvent.pointerDown(row, { button: 0 });
    fireEvent.pointerUp(row);
    fireEvent.pointerDown(screen.getByRole("textbox", { name: "Completed amount" }), { button: 0 });
    act(() => vi.advanceTimersByTime(1000));
    expect(onHold).not.toHaveBeenCalled();
  });

  it("opens with Enter for keyboard users", () => {
    const onHold = vi.fn();
    render(<Example onHold={onHold} />);
    fireEvent.keyDown(screen.getByRole("group", { name: "Istighfar target" }), { key: "Enter" });
    expect(onHold).toHaveBeenCalledTimes(1);
  });
});
