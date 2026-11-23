import { useState } from "react";
import {
  BarChart3,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Target,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, ProgressLine } from "./shared";
import {
  dateKey,
  downloadFile,
  GUARDRAILS,
  makeDay,
  scoreDay,
  streak,
  type Day,
} from "@/lib/mizan";

export function Analytics({
  history,
  date,
  sample,
}: {
  history: Record<string, Day>;
  date: string;
  sample: boolean;
}) {
  const [period, setPeriod] = useState("Weekly");
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const display: Record<string, Day> = { ...history };
  if (sample) {
    for (let i = 1; i < 180; i++) {
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() - i);
      if (i % 9 !== 0) {
        const day = makeDay(true);
        day.workMinutes = 180 + ((i * 37) % 180);
        day.istighfar = 600 + ((i * 71) % 600);
        day.prayers = day.prayers.map((p, j) => ({
          ...p,
          status: j < (i % 3) + 4 ? "On time" : "Late",
        }));
        day.tasks = day.tasks.map((t, j) => ({
          ...t,
          done: j < (i % 3) + 1,
          count: t.countTo ? Math.round((t.countTo * ((i % 5) + 1)) / 5) : 0,
        }));
        display[dateKey(d)] = day;
      }
    }
  }
  const entries = Object.entries(display).sort(([a], [b]) => a.localeCompare(b));
  const days = period === "Daily" ? 1 : period === "Weekly" ? 7 : period === "Monthly" ? 30 : 365;
  const selected = Array.from({ length: days }, (_, i) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - days + 1 + i);
    const key = dateKey(d);
    return { key, date: d, day: display[key] };
  });
  const recorded = selected.filter((d) => d.day);
  const avg =
    recorded.reduce((s, d) => s + (d.day ? scoreDay(d.day).score : 0), 0) /
    Math.max(1, recorded.length);
  const pillars = { prayers: 0, purity: 0, targets: 0 };
  for (const d of recorded) {
    if (d.day) {
      const p = scoreDay(d.day).pillars;
      for (const key of Object.keys(pillars) as (keyof typeof pillars)[])
        pillars[key] += p[key] / Math.max(1, recorded.length);
    }
  }
  const weakest = Object.entries(pillars).sort(([, a], [, b]) => a - b)[0];
  const pillarNames: Record<string, string> = {
    prayers: "Prayers",
    purity: "Commitments",
    targets: "Targets",
  };
  const first = new Date(`${month}-01T12:00:00`);
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const shiftMonth = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(dateKey(d).slice(0, 7));
  };
  const level = (s: number) => (s === 0 ? 0 : s < 4 ? 1 : s < 6 ? 2 : s < 8 ? 3 : 4);
  const yearDays = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - 364 + i);
    const key = dateKey(d);
    return { key, date: d, day: display[key] };
  });
  const monthMarks: { key: string; label: string; col: number }[] = [];
  let lastMark = "";
  yearDays.forEach((d, i) => {
    const mark = `${d.date.getFullYear()}-${d.date.getMonth()}`;
    if (mark === lastMark) return;
    lastMark = mark;
    const col = Math.floor(i / 7);
    // A name needs ~4 columns of room; otherwise it runs into the next month.
    if (monthMarks[monthMarks.length - 1] && col - monthMarks[monthMarks.length - 1]!.col < 4)
      return;
    const label = d.date.toLocaleDateString("en", { month: "short" });
    monthMarks.push({
      key: mark,
      label: d.date.getMonth() === 0 || i === 0 ? `${label} ${d.date.getFullYear()}` : label,
      col,
    });
  });
  return (
    <div className="enter-view">
      <div className="flex flex-wrap gap-2 mb-6">
        {["Daily", "Weekly", "Monthly", "Yearly"].map((p) => (
          <Button
            key={p}
            variant={p === period ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() =>
            downloadFile(
              `mizan-${date}.json`,
              JSON.stringify({ history }, null, 2),
              "application/json",
            )
          }
        >
          <Download />
          Export JSON
        </Button>
      </div>
      {sample && (
        <p className="text-xs text-muted-foreground mb-5">
          Sample consistency history · your private history starts after sign-in.
        </p>
      )}
      <div className="grid sm:grid-cols-3 gap-5 mb-5">
        {[
          {
            name: "Average Mizan",
            value: avg.toFixed(1),
            suffix: "/ 10",
            icon: Target,
            gold: true,
          },
          {
            name: "Days of intention",
            value: String(recorded.length),
            suffix: `/ ${days} days`,
            icon: Flame,
            gold: false,
          },
          {
            name: "Weakest pillar",
            value: pillarNames[weakest?.[0] ?? "prayers"],
            suffix: `${Math.round((weakest?.[1] ?? 0) * 100)}%`,
            icon: ShieldCheck,
            gold: false,
          },
        ].map((s) => (
          <div className="panel p-6" key={s.name}>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{s.name}</span>
              <s.icon className={s.gold ? "text-gold" : "text-violet-soft"} size={16} />
            </div>
            <div className={`font-display text-2xl mt-4 ${s.gold ? "text-gold" : ""}`}>
              {s.value}
              <span className="ml-2 text-xs text-muted-foreground font-sans">{s.suffix}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        <Panel title={`${period} balance`} icon={<BarChart3 />}>
          <div className="p-6">
            <div className="bar-chart !h-[210px] !gap-2">
              {selected.map((d) => (
                <div
                  className="bar-col"
                  key={d.key}
                  title={`${d.key}: ${d.day ? scoreDay(d.day).score : "Not logged"}`}
                >
                  <div
                    className="bar-fill"
                    style={{ height: `${(d.day ? scoreDay(d.day).score : 0) * 17}px` }}
                  />
                  {days <= 31 && (
                    <span className="bar-label">
                      {days <= 7
                        ? d.date.toLocaleDateString("en", { weekday: "short" })
                        : d.date.getDate()}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              {selected[0]?.key} — {date}
            </p>
          </div>
        </Panel>
        <Panel title="A gentle look" icon={<ShieldCheck />}>
          <div className="p-6">
            <p className="font-display text-lg">
              {recorded.length
                ? `${pillarNames[weakest?.[0] ?? "prayers"]} could use a little more care.`
                : "Your first honest day starts here."}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">
              {!recorded.length
                ? "Log one prayer, protect one commitment, and begin. There is nothing to defend yet."
                : "Pick one small thing tomorrow and give it a time you can actually keep. Small and kept beats big and hoped for."}
            </p>
            <div className="space-y-4 mt-6">
              {Object.entries(pillars).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs flex justify-between mb-2">
                    <span>{pillarNames[key]}</span>
                    <span className="font-mono text-muted-foreground">
                      {Math.round(value * 100)}%
                    </span>
                  </div>
                  <ProgressLine value={value * 100} />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-5 mt-5">
        <Panel
          title="Monthly intentions"
          icon={<BarChart3 />}
          action={
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous month"
                className="size-7"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs">
                {first.toLocaleDateString("en", { month: "short", year: "numeric" })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next month"
                className="size-7"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          }
        >
          <div className="p-6 heatmap">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} className="text-[10px] text-center text-muted-foreground">
                {d}
              </span>
            ))}
            {Array.from({ length: first.getDay() }, (_, i) => (
              <span key={`blank${i}`} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const key = `${month}-${String(i + 1).padStart(2, "0")}`;
              const day = display[key];
              const score = day ? scoreDay(day).score : 0;
              return (
                <div
                  className="heatmap-cell flex items-center justify-center text-xs"
                  data-level={level(score)}
                  key={key}
                  title={`${key}: ${day ? score : "Not logged"}`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Streaks that matter" icon={<Flame />}>
          <div className="p-6 grid sm:grid-cols-2 gap-5">
            {GUARDRAILS.map((name, i) => {
              const s = streak(display, i, date);
              return (
                <div key={name} className="border-b border-border pb-3">
                  <p className="text-xs">{name}</p>
                  <p className="font-mono text-xl mt-2">
                    {s.current}
                    <span className="font-sans text-[10px] text-muted-foreground ml-2">
                      days · best {s.longest}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Panel
        title="A year of returning"
        icon={<Flame />}
        className="mt-5"
        action={<ArrowUpRight size={14} className="text-muted-foreground" />}
      >
        <div className="p-6">
          <div className="year-scroll">
            <div className="year-inner">
              <div className="year-months" aria-hidden="true">
                {monthMarks.map((m) => (
                  <span key={m.key} style={{ gridColumnStart: m.col + 1 }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="year-grid">
                {yearDays.map(({ key, day }) => {
                  const score = day ? scoreDay(day).score : 0;
                  return (
                    <div
                      className="heatmap-cell"
                      key={key}
                      data-level={level(score)}
                      title={`${key}: ${day ? score : "Not logged"}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-4">
            Only the days you showed up are marked. Every day is another opportunity.
          </p>
        </div>
      </Panel>
    </div>
  );
}
