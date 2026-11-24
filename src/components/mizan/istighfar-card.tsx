import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Day, RepeatPlan } from "@/lib/mizan";

const SERIES = "istighfar-daily";
const isIstighfar = (name: string) => /istighfar/i.test(name);

type Props = {
  day: Day;
  date: string;
  update: (d: Day) => Promise<void> | void;
  repeat: (plan: RepeatPlan) => Promise<number>;
};

/** Main-page Istighfar: fix a daily target for a range of months, then fill in what you completed. */
export function IstighfarCard({ day, date, update, repeat }: Props) {
  const task = day.tasks.find((t) => isIstighfar(t.name) && t.countTo > 0);
  const month = date.slice(0, 7);
  const [target, setTarget] = useState(String(task?.countTo ?? 1000));
  const [start, setStart] = useState(month);
  const [end, setEnd] = useState(month);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const done = task ? Math.min(task.count, task.countTo) : 0;
  const pct = task ? Math.round((done / task.countTo) * 100) : 0;

  async function apply() {
    const n = Math.floor(Number(target));
    if (!n || n < 1) return setMsg("Enter a daily target above zero.");
    if (end < start) return setMsg("End month must come after the start month.");
    setBusy(true);
    try {
      if (task) await update({ ...day, tasks: day.tasks.map((t) => (t.id === task.id ? { ...t, countTo: n } : t)) });
      const days = await repeat({
        task: { id: SERIES, seriesId: task?.seriesId ?? SERIES, name: "Istighfar", from: "20:00", to: "21:00", done: false, count: 0, countTo: n },
        startMonth: start,
        endMonth: end,
        frequency: "daily",
      });
      setMsg(`Target of ${n} set for ${days} days.`);
    } catch {
      setMsg("Could not save the target. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="istighfar-card rounded-xl border border-border bg-card/60 p-5 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Istighfar</h2>
        <span className="text-sm text-muted-foreground">
          {task ? `${done} / ${task.countTo} · ${pct}%` : "No target for today yet"}
        </span>
      </div>
      {task && (
        <>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <label className="mt-4 grid gap-1 text-sm">
            Completed today
            <input
              className="field h-12 text-lg"
              type="text"
              inputMode="numeric"
              value={task.count || ""}
              placeholder="0"
              onChange={(e) => {
                const c = Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0);
                void update({ ...day, tasks: day.tasks.map((t) => (t.id === task.id ? { ...t, count: c, done: c >= t.countTo, missed: false } : t)) });
              }}
            />
          </label>
        </>
      )}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <label className="grid gap-1 text-sm">
          Daily target
          <input className="field h-11" type="text" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="grid gap-1 text-sm">
          From month
          <input className="field h-11" type="month" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          To month
          <input className="field h-11" type="month" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <Button className="h-11" onClick={apply} disabled={busy}>{busy ? "Saving…" : "Set target"}</Button>
      </div>
      {msg && <p className="mt-2 text-sm text-muted-foreground" role="status">{msg}</p>}
    </section>
  );
}
