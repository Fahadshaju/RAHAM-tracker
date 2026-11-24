import { useState } from "react";
import { Check, Clock, Plus, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, ProgressLine } from "./shared";
import { repeatDates, taskIsDone, type RepeatPlan, type Day } from "@/lib/mizan";
import { toast } from "sonner";

/**
 * The plan tab: fill in the space and the timings, and the day writes itself.
 * A target is either ticked when finished, or given a number to count up to.
 */
export function Plan({
  day,
  update,
  sample,
  date,
  repeat,
}: {
  day: Day;
  update: (day: Day) => void | Promise<void>;
  sample: boolean;
  date: string;
  repeat: (plan: RepeatPlan) => Promise<number>;
}) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("09:00");
  const [countTo, setCountTo] = useState("");
  const [repeating, setRepeating] = useState(false);
  const [startMonth, setStartMonth] = useState(date.slice(0, 7));
  const [endMonth, setEndMonth] = useState(date.slice(0, 7));
  const [frequency, setFrequency] = useState<RepeatPlan["frequency"]>("daily");
  const [busy, setBusy] = useState(false);
  const tasks = day.tasks;
  const done = tasks.filter(taskIsDone).length;

  async function add() {
    const label = name.trim();
    if (!label) {
      toast.error("Write what you intend to do first.");
      return;
    }
    if (to <= from) {
      toast.error("The end time should come after the start time.");
      return;
    }
    const number = countTo.trim() ? Number(countTo) : 0;
    if (countTo.trim() && (!Number.isInteger(number) || number < 1)) {
      toast.error("The number should be a whole number of 1 or more.");
      return;
    }
    const task = { id: crypto.randomUUID(), name: label, from, to, done: false, count: 0, countTo: number };
    setBusy(true);
    try {
      if (repeating) {
        const plan = { task, startMonth, endMonth, frequency };
        repeatDates(plan);
        const total = await repeat(plan);
        toast.success(`${label} scheduled for ${total} days${sample ? " in your sample workspace" : ""}.`);
      } else {
        await update({ ...day, tasks: [...tasks, task] });
        toast.success(`${label} added to ${date}.`);
      }
      setName("");
      setCountTo("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your plan could not be saved. Try again.");
    } finally { setBusy(false); }
  }

  function patch(id: string, next: Partial<(typeof tasks)[number]>) {
    void update({ ...day, tasks: tasks.map((t) => (t.id === id ? { ...t, ...next } : t)) });
  }

  function remove(id: string) {
    void update({ ...day, tasks: tasks.filter((t) => t.id !== id) });
  }

  return (
    <div className="enter-view">
      <Panel title="Set your target" icon={<ListChecks />}>
        <div className="p-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Plan duration">
            <Button variant={!repeating ? "secondary" : "ghost"} aria-pressed={!repeating} onClick={() => setRepeating(false)}>Selected day</Button>
            <Button variant={repeating ? "secondary" : "ghost"} aria-pressed={repeating} onClick={() => setRepeating(true)}>Repeat across months</Button>
          </div>
          {repeating && <div className="repeat-plan-fields mt-6">
            <label className="plan-time">Start month<input className="field" aria-label="Start month" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} /></label>
            <label className="plan-time">End month<input className="field" aria-label="End month" type="month" min={startMonth} value={endMonth} onChange={(e) => setEndMonth(e.target.value)} /></label>
            <label className="plan-time">Repeat<select className="field" aria-label="Repeat frequency" value={frequency} onChange={(e) => setFrequency(e.target.value === "weekdays" ? "weekdays" : "daily")}><option value="daily">Every day</option><option value="weekdays">Monday–Friday</option></select></label>
          </div>}
          <div className="plan-form mt-5">
            <input
              className="field plan-name"
              placeholder="What are you doing?"
              aria-label="Target name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && void add()}
            />
            <label className="plan-time">
              <span>From</span>
              <input
                type="time"
                className="field"
                aria-label="Start time"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="plan-time">
              <span>To</span>
              <input
                type="time"
                className="field"
                aria-label="End time"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label className="plan-time">
              <span>Number (optional)</span>
              <input
                type="number"
                min={1}
                step={1}
                className="field"
                aria-label="Number to reach"
                placeholder="—"
                value={countTo}
                onChange={(e) => setCountTo(e.target.value)}
              />
            </label>
            <Button variant="glow" className="plan-add" disabled={busy} onClick={() => void add()}>
              <Plus size={14} />
              {busy ? "Saving plan…" : repeating ? "Save repeating target" : "Add target"}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title={`Targets · ${date}`}
        icon={<Clock />}
        className="mt-5"
        action={
          <span className="pill">
            {done} of {tasks.length} done
          </span>
        }
      >
        <div className="p-6">
          {tasks.length ? (
            <>
              <ProgressLine value={tasks.length ? (done / tasks.length) * 100 : 0} />
              <div className="mt-5 grid gap-2">
                {tasks.map((t) => (
                  <div className={`plan-row ${taskIsDone(t) ? "is-done" : ""}`} key={t.id}>
                    {t.countTo ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        aria-label={`Count ${t.name} up by one`}
                        onClick={() => patch(t.id, { count: t.count + 1 })}
                      >
                        <Plus size={14} />
                      </Button>
                    ) : (
                      <input
                        className="prayer-check"
                        type="checkbox"
                        aria-label={`Mark ${t.name} done`}
                        checked={t.done}
                        onChange={(e) => patch(t.id, { done: e.target.checked })}
                      />
                    )}
                    <input
                      className="plan-row-name bg-transparent border-0"
                      aria-label="Target name"
                      value={t.name}
                      onChange={(e) => patch(t.id, { name: e.target.value })}
                    />
                    <span className="plan-row-time font-mono text-[10px] text-muted-foreground">
                      {t.from}–{t.to}
                      {t.countTo ? ` · ${Math.min(t.count, t.countTo)}/${t.countTo}` : ""}
                      {t.seriesId && <span className="block text-violet-soft font-sans">Repeating target</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={`Remove ${t.name}`}
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Check size={22} className="mx-auto text-violet-soft" />
              <p className="text-xs text-muted-foreground mt-3">
                Nothing written yet. Add the first thing you intend to finish today.
              </p>
            </div>
          )}
          {sample && tasks.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-4">
              These are sample targets. Yours start fresh when you sign in.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
