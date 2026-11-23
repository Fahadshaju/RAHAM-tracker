// Main-page garden: grows from the journal's prayers and targets; withers on a negative day.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Sprout, Skull } from "lucide-react";
import { HALF, forestLevel, freeSpot, journalGarden, unlocked, type GardenTree } from "@/lib/garden";
import type { Day } from "@/lib/mizan";

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
  return (
    <section className="panel journal-garden mb-5">
      <div className="journal-garden-canvas">{mounted && <Suspense fallback={null}><GardenScene trees={trees} level={level} upgrades={unlocked(g.streak)} withered={g.withered} /></Suspense>}</div>
      <div className="journal-garden-hud">
        <span className="pill">{g.withered ? <Skull size={11} /> : <Sprout size={11} />} {g.withered ? "Garden withering" : "Garden growing"}</span>
        <span className="text-[11px]">Trees: <b style={{ color: "var(--gold)" }}>{g.trees}</b> · Level {level} · Today {g.todayPoints >= 0 ? "+" : ""}{g.todayPoints}</span>
        <span className="text-[10px] text-muted-foreground">+1 per prayer · +1 per target (up to 10) · −2 per missed prayer</span>
      </div>
    </section>
  );
}
