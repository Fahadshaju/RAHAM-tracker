import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";

const HOLD_DELAY = 550;
const MOVE_TOLERANCE = 12;
const INTERACTIVE = "input, button, select, textarea, a";

function isInteractive(target: EventTarget) {
  return target instanceof HTMLElement && !!target.closest(INTERACTIVE);
}

/** Press and hold a row, right-click it, or focus it and press Enter/Space. */
export function HoldToSet({
  children,
  className,
  label,
  onHold,
}: {
  children: ReactNode;
  className: string;
  label: string;
  onHold: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const point = useRef({ x: 0, y: 0 });

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isInteractive(event.target)) return;
    point.current = { x: event.clientX, y: event.clientY };
    cancel();
    timer.current = setTimeout(() => {
      timer.current = null;
      onHold();
    }, HOLD_DELAY);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!timer.current) return;
    if (Math.hypot(event.clientX - point.current.x, event.clientY - point.current.y) > MOVE_TOLERANCE) cancel();
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onHold();
  }

  function contextMenu(event: MouseEvent<HTMLDivElement>) {
    if (isInteractive(event.target)) return;
    event.preventDefault();
    cancel();
    onHold();
  }

  return (
    <div
      className={className}
      role="group"
      aria-label={label}
      tabIndex={0}
      data-hold-to-set=""
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onKeyDown={keyDown}
      onContextMenu={contextMenu}
    >
      {children}
    </div>
  );
}
