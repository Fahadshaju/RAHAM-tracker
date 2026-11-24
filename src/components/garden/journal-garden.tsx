// Main-page garden: grows from the journal's prayers and targets; withers on a negative day.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Sprout, Skull } from "lucide-react";
import { HEAVEN_TIER_NAMES, HELL_TIER_NAMES, heavenTier, hellDepth, nextHeavenTier, HALF, forestLevel, freeSpot, journalGarden, unlocked, type GardenTree } from "@/lib/garden";
import { prayerStreak, type Day } from "@/lib/mizan";
import { Switch } from "@/components/ui/switch";

const GOALS = [7, 21, 40, 100];

const GardenScene = lazy(() => import("./scene"));

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function JournalGarden({ history, date }: { history: Record<string, Day>; date: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const g = journalGarden(history, date);
  // Same tree positions every time for the same count; new trees get a fresh planting time so they grow.
  const born = useRef<number[]>([]);
  const first = useRef(true);
  const trees = useMemo<GardenTree[]>(() => {
    const rand = seeded(42);
    const list: GardenTree[] = [];
    for (let i = 0; i < g.trees; i++) {
      const spot = freeSpot(list, rand) ?? { x: (rand() * 2 - 1) * HALF, z: (rand() * 2 - 1) * HALF };
      if (born.current[i] === undefined) born.current[i] = first.current ? 0 : Date.now();
      list.push({ id: `${i}`, ...spot, plantedAt: born.current[i] ?? 0, seed: Math.floor(rand() * 1000) });
    }
    first.current = false;
    return list;
  }, [g.trees]);
  const level = forestLevel(g.trees);
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
  const ps = prayerStreak(history, date, six);
  const tier = heavenTier(ps.current);
  const next = nextHeavenTier(ps.current);
  const depth = hellDepth(history, date);
  const pct = Math.min(100, Math.round((ps.current / goal) * 100));
  const reached = mounted && ps.current >= goal;
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!reached) return;
    const key = `raham-celebrated-${goal}-${ps.current - goal === 0 ? date : "x"}`;
    if (ps.current !== goal || localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setCelebrate(true);
    const t = setTimeout(() => setCelebrate(false), 6500);
    return () => clearTimeout(t);
  }, [reached, goal, ps.current, date]);
  const save = (key: string, v: string) => {
    localStorage.setItem(key, v);
    window.dispatchEvent(new Event("raham-settings"));
  };
  return (
    <section className="panel journal-garden mb-5">
      <div className="journal-garden-canvas">{mounted && <Suspense fallback={null}><GardenScene trees={trees} level={level} upgrades={unlocked(g.streak)} withered={g.withered} tier={tier} depth={Math.max(1, depth)} /></Suspense>}</div>
      <div className="streak-hero">
        <span className="streak-hero-label">Prayer streak</span>
        <span className="streak-hero-number" key={ps.current}>{ps.current}</span>
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
            <input aria-label="Custom streak target" type="number" min={1} max={3650} placeholder="Custom" className="streak-goal-chip w-[76px] bg-transparent" onChange={(e) => { const n = Math.floor(Number(e.target.value)); if (n > 0 && n <= 3650) { setGoal(n); save("raham-streak-goal", String(n)); } }} />
          </div>
          <label className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span>Compulsory: {six ? "all 6 incl. Tahajjud" : "5 obligatory prayers"}</span>
            <Switch aria-label="Make Tahajjud compulsory" checked={six} onCheckedChange={(v) => { setSix(v); save("raham-six-prayers", v ? "1" : "0"); }} />
          </label>
          {ps.current >= goal && <span className="pill" style={{ color: "var(--gold)" }}>Milestone reached — set the next one</span>}
        </div>
      </div>
      {celebrate && (
        <div className="streak-celebrate" role="status" onClick={() => setCelebrate(false)}>
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.12}s`, background: i % 3 ? "var(--gold)" : "var(--primary)" }} />
          ))}
          <div className="streak-celebrate-card">
            <span className="streak-celebrate-num">{goal}</span>
            <b>Target reached — MashaAllah!</b>
            <span>{goal} days of steadfast prayer. Keep going and set your next milestone.</span>
          </div>
        </div>
      )}
      <details className="journal-garden-hud">
        <summary className="pill">{g.withered ? <Skull size={11} /> : <Sprout size={11} />} {g.withered ? "Garden withering" : "Garden growing"}</summary>
        <span className="text-[11px]">Trees: <b style={{ color: "var(--gold)" }}>{g.trees}</b> · Level {level} · Today {g.todayPoints >= 0 ? "+" : ""}{g.todayPoints}</span>
        <span className="text-[11px]" style={{ color: g.withered ? "var(--destructive)" : "var(--gold)" }}>{g.withered ? `Hell · depth ${Math.max(1, depth)}/4 — ${HELL_TIER_NAMES[Math.max(1, depth)]}` : `Heaven · tier ${tier}/5 — ${HEAVEN_TIER_NAMES[tier]}`}</span>
        {!g.withered && next && <span className="text-[10px] text-muted-foreground">Next: {next.name} in {next.inDays} {next.inDays === 1 ? "day" : "days"} of prayer</span>}
        <span className="text-[10px] text-muted-foreground">+1 per prayer · +1 per target (up to 10) · −2 per missed prayer</span>
      </details>
    </section>
  );
}
