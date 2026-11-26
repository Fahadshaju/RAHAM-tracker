// Main-page garden: grows from prayers, commitments and targets; withers on a negative day.
import { lazyWithReload } from "@/lib/lazy-reload";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Sprout, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HELL_TIER_NAMES, heavenTier, heavenTierName, hellDepth, nextHeavenTier, HALF, forestLevel, freeSpot, journalGarden, unlocked, type GardenTree } from "@/lib/garden";
import { prayerStreak, type Day } from "@/lib/mizan";
import { StreakHero } from "./streak-hero";


const GardenScene = lazyWithReload(() => import("./scene"));

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function JournalGarden({ history, date }: { history: Record<string, Day>; date: string }) {
  // Phones start with the 3D garden minimized (it is the heaviest part of the page);
  // computers load it once the page is idle so the first screen appears quickly.
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setMobile(isMobile);
    if (isMobile) return;
    // Start the 3D scene on the first real interaction (mouse move, scroll, key, touch),
    // so the first screen is never blocked by it.
    const evs = ["pointermove", "pointerdown", "wheel", "scroll", "keydown", "touchstart"] as const;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      evs.forEach((e) => window.removeEventListener(e, go));
      setMounted(true);
    };
    evs.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    return () => { done = true; evs.forEach((e) => window.removeEventListener(e, go)); };
  }, []);
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
  const [developmentStage, setDevelopmentStage] = useState<number | null>(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const value = new URLSearchParams(window.location.search).get("gardenStage");
    if (value === null) return;
    const stage = Number(value);
    if (Number.isInteger(stage) && stage >= 0 && stage <= 12) setDevelopmentStage(stage);
  }, []);
  const realTier = developmentStage ?? heavenTier(ps.current);
  const next = nextHeavenTier(ps.current);
  const depth = hellDepth(history, date);
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
  return (
    <section className={`panel journal-garden mb-5${mobile && !mounted ? " is-min" : ""}`}>
      {mobile && (
        <Button variant="outline" type="button" className="garden-toggle pill" onClick={() => setMounted((v) => !v)} aria-expanded={mounted}>
          {mounted ? "Minimize Heaven & Hell ▴" : "Open Heaven & Hell 3D ▾"}
        </Button>
      )}
      <div className="garden-stage">
      <div className="journal-garden-canvas">{mounted && <Suspense fallback={<div className="garden-preview-loading" role="status">Loading garden…</div>}><GardenScene trees={trees} level={level} upgrades={unlocked(g.streak)} withered={g.withered} tier={realTier} depth={Math.max(1, depth)} /></Suspense>}</div>
      {/* Phones show the streak in its own card above the Prayer tracker (see Daily). */}
      <div className="streak-desktop"><StreakHero history={history} date={date} /></div>
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
        <span className="text-[11px]" style={{ color: g.withered ? "var(--destructive)" : "var(--gold)" }}>{g.withered ? `Hell · depth ${Math.max(1, depth)}/4 — ${HELL_TIER_NAMES[Math.max(1, depth)]}` : `Heaven · level ${realTier} — ${heavenTierName(realTier)}`}</span>
        {!g.withered && next && <span className="text-[10px] text-muted-foreground">Next: {next.name} in {next.inDays} {next.inDays === 1 ? "day" : "days"} of prayer</span>}
        <span className="text-[10px] text-muted-foreground">+1 per prayer · +1 per target (up to 10) · −2 per missed prayer · +5/−5 per kept/missed Nafs habit or rule</span>
      </details>
      </div>
    </section>
  );
}
