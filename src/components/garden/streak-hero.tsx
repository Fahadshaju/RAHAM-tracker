// Big prayer-streak number with milestone and Tahajjud controls. Rendered on the server
// so it paints with the first screen; settings sync through the "raham-settings" event.
import { useEffect, useState } from "react";
import { prayerStreak, type Day } from "@/lib/mizan";
import { Switch } from "@/components/ui/switch";

const GOALS = [7, 21, 40, 100];

export function StreakHero({ history, date }: { history: Record<string, Day>; date: string }) {
  const [six, setSix] = useState(false);
  const [goal, setGoal] = useState(40);
  useEffect(() => {
    const read = () => {
      setSix(localStorage.getItem("raham-six-prayers") === "1");
      const n = Number(localStorage.getItem("raham-streak-goal"));
      if (n > 0) setGoal(n);
    };
    read();
    window.addEventListener("raham-settings", read);
    return () => window.removeEventListener("raham-settings", read);
  }, []);
  const save = (key: string, v: string) => {
    localStorage.setItem(key, v);
    window.dispatchEvent(new Event("raham-settings"));
  };
  const ps = prayerStreak(history, date, six);
  const pct = Math.min(100, Math.round((ps.current / goal) * 100));
  return (
      <div className="streak-hero">
        <span className="streak-hero-label">Prayer streak</span>
        <span className="streak-hero-number">{ps.current}</span>
        <span className="streak-hero-unit">{ps.current === 1 ? "day" : "days"} · best {ps.longest}</span>
        <div className="streak-hero-goal">
          <div className="flex items-center justify-between text-[12px]">
            <span>Milestone: <b style={{ color: "var(--gold)" }}>{goal} days</b></span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="streak-hero-bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((n) => (
              <button key={n} type="button" className={`streak-goal-chip${n === goal ? " is-on" : ""}`} onClick={() => { setGoal(n); save("raham-streak-goal", String(n)); }}>{n}</button>
            ))}
            <input aria-label="Custom streak target" type="number" min={1} max={3650} placeholder="Custom" className="streak-goal-chip w-[84px] bg-transparent" onChange={(e) => { const n = Math.floor(Number(e.target.value)); if (n > 0 && n <= 3650) { setGoal(n); save("raham-streak-goal", String(n)); } }} />
          </div>
          <label className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span>Compulsory: {six ? "all 6 incl. Tahajjud" : "5 obligatory prayers"}</span>
            <Switch aria-label="Make Tahajjud compulsory" checked={six} onCheckedChange={(v) => { setSix(v); save("raham-six-prayers", v ? "1" : "0"); }} />
          </label>
          {ps.current >= goal && <span className="pill" style={{ color: "var(--gold)" }}>Milestone reached — set the next one</span>}
        </div>
      </div>
  );
}
