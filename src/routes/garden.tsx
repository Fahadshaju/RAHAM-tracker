// Jannat garden page: task list on the left, a 3D paradise box that grows with finished tasks and streaks.
import { lazyWithReload } from "@/lib/lazy-reload";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, RotateCcw, Trash2, Volume2, VolumeX, ChevronDown } from "lucide-react";
import {
  MAX_TREES, TIERS, UPGRADES, forestLevel, freeSpot, gardenStreak, unlocked, type GardenState,
} from "@/lib/garden";
import { startAmbience } from "@/components/garden/sound";

const GardenScene = lazyWithReload(() => import("@/components/garden/scene"));
const KEY = "raham-garden-v1";
const today = () => new Date().toLocaleDateString("en-CA");

export const Route = createFileRoute("/garden")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Jannat Garden — RAHAM" },
      { name: "description", content: "Finish tasks to plant trees in a 3D paradise garden that grows with your streak." },
      { property: "og:title", content: "Jannat Garden — RAHAM" },
      { property: "og:description", content: "Every finished task plants a tree. Keep your streak and the garden of paradise grows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Garden,
});

function load(): GardenState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (Array.isArray(s.tasks) && Array.isArray(s.trees)) return { days: [], ...s };
  } catch {}
  return { tasks: [], trees: [], days: [] };
}

function Garden() {
  const [state, setState] = useState<GardenState>(load);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [open, setOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const stopSound = useRef<null | (() => void)>(null);

  // Save everything after each change, so progress survives a refresh.
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(state)), [state]);
  useEffect(() => () => stopSound.current?.(), []);

  const planted = state.trees.length;
  const level = forestLevel(planted);
  const streak = gardenStreak(state.days, today());
  const ups = unlocked(streak);
  const nextTier = TIERS.find((t) => t > planted);
  const prevTier = [...TIERS].reverse().find((t) => t <= planted) ?? 0;
  const progress = nextTier ? ((planted - prevTier) / (nextTier - prevTier)) * 100 : 100;
  const nextUp = UPGRADES[ups];

  function celebrate(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }

  function add() {
    const t = text.trim();
    if (!t) return;
    setState((s) => ({ ...s, tasks: [{ id: crypto.randomUUID(), text: t, done: false }, ...s.tasks] }));
    setText("");
  }

  // Completing a task plants one tree and marks today for the streak.
  function toggle(id: string) {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return s;
      const tasks = s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      if (task.done) return { ...s, tasks };
      const spot = s.trees.length < MAX_TREES ? freeSpot(s.trees) : null;
      const trees = spot
        ? [...s.trees, { id, ...spot, plantedAt: Date.now(), seed: Math.floor(Math.random() * 1000) }]
        : s.trees;
      const days = s.days.includes(today()) ? s.days : [...s.days, today()];
      const lvl = forestLevel(trees.length);
      if (lvl > forestLevel(s.trees.length)) celebrate(`Forest level ${lvl} reached`);
      const u = unlocked(gardenStreak(days, today()));
      if (u > unlocked(gardenStreak(s.days, today()))) celebrate(`Unlocked: ${UPGRADES[u - 1]?.name}`);
      return { tasks, trees, days };
    });
  }

  function toggleSound() {
    if (muted) stopSound.current = startAmbience();
    else stopSound.current?.();
    setMuted(!muted);
  }

  function reset() {
    if (window.confirm("Reset the garden? All tasks and trees will be removed.")) {
      setState({ tasks: [], trees: [], days: [] });
    }
  }

  return (
    <div className="garden-page">
      <div className="garden-canvas">
        <Suspense fallback={null}>
          <GardenScene trees={state.trees} level={level} upgrades={ups} />
        </Suspense>
      </div>

      <aside className="garden-glass garden-panel" data-open={open}>
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="garden-icon" aria-label="Back to RAHAM"><ArrowLeft size={15} /></Link>
          <h1 className="garden-title">Jannat Garden</h1>
          <button className="garden-icon" onClick={() => setOpen(!open)} aria-label="Show or hide tasks">
            <ChevronDown size={15} style={{ transform: open ? "none" : "rotate(180deg)" }} />
          </button>
        </div>
        <p className="garden-counter">Trees planted: {planted} · Forest level: {level}</p>
        <div className="garden-bar"><span style={{ width: `${progress}%` }} /></div>
        <p className="garden-sub">
          {nextTier ? `${nextTier - planted} more to level ${level + 1}` : "Your forest is complete"} · Streak {streak} day{streak === 1 ? "" : "s"}
          {nextUp ? ` · ${nextUp.days - streak} to “${nextUp.name}”` : ""}
        </p>

        <div className="garden-body">
          <div className="flex gap-2 mt-4">
            <input
              className="garden-input"
              placeholder="A task to finish today…"
              aria-label="New task"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button className="garden-icon gold" onClick={add} aria-label="Add task"><Plus size={16} /></button>
          </div>
          <ul className="garden-list">
            {state.tasks.map((t) => (
              <li key={t.id} className="garden-task" data-done={t.done}>
                <button className="garden-check" onClick={() => toggle(t.id)} aria-label={`Complete ${t.text}`}>
                  {t.done && <Check size={12} />}
                </button>
                {editing === t.id ? (
                  <input
                    autoFocus
                    className="garden-input flex-1"
                    defaultValue={t.text}
                    aria-label="Edit task"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      setState((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === t.id && v ? { ...x, text: v } : x)) }));
                      setEditing(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  />
                ) : (
                  <span className="flex-1 truncate">{t.text}</span>
                )}
                <button className="garden-icon small" onClick={() => setEditing(t.id)} aria-label={`Edit ${t.text}`}><Pencil size={12} /></button>
                <button
                  className="garden-icon small"
                  onClick={() => setState((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }))}
                  aria-label={`Delete ${t.text}`}
                ><Trash2 size={12} /></button>
              </li>
            ))}
            {!state.tasks.length && <li className="garden-sub py-4">Add a task. Each one you finish plants a tree.</li>}
          </ul>
          <div className="flex justify-between mt-4">
            <button className="garden-link" onClick={toggleSound}>
              {muted ? <VolumeX size={13} /> : <Volume2 size={13} />} {muted ? "Sound off" : "Sound on"}
            </button>
            <button className="garden-link" onClick={reset}><RotateCcw size={13} /> Reset garden</button>
          </div>
        </div>
      </aside>

      <p className="garden-hint">Drag to look around · scroll or pinch to zoom · double-tap the grass to fly there</p>
      {toast && <div className="garden-toast" role="status">{toast}</div>}
    </div>
  );
}
