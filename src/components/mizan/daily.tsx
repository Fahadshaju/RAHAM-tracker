import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Moon,
  Sunrise,
  Sun,
  Sunset,
  Check,
  Camera,
  Flame,
  ShieldCheck,
  Code2,
  Play,
  Pause,
  RotateCcw,
  X,
  Plus,
  ArrowUpRight,
  BookOpen,
  HeartHandshake,
  CheckCircle2,
  MapPin,
  Settings2,
  ChevronRight,
  Target,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { prayerPoints, prayerStreak } from "@/lib/mizan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Panel, ProgressLine, Reminder, Ring } from "./shared";
import { HoldToSet } from "./hold-to-set";
import { TaskTargetDialog } from "./task-target-dialog";
import { type useMizanJournal } from "@/hooks/use-mizan-journal";
import { GUARDRAILS, HABIT_POINTS_PER_DAY, HABIT_BADGES, badgeProgress, scoreDay, streak, taskIsDone, taskPoints, verdict, formatMinutes, type Task } from "@/lib/mizan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Journal = ReturnType<typeof useMizanJournal>;
const prayerIcons = [Moon, Sunrise, Sun, Sun, Sunset, Moon];
export function Daily({
  journal,
  onAuth,
  onAnalytics,
}: {
  journal: Journal;
  onAuth: () => void;
  onAnalytics: () => void;
}) {
  const { day, date, update, history, user } = journal;
  const { score, pillars, tasksDone, tasksTotal } = scoreDay(day);
  const [proofOpen, setProofOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [prayerMenu, setPrayerMenu] = useState<string | null>(null);
  const [sixPrayers, setSixPrayers] = useState(false);
  useEffect(() => {
    const read = () => setSixPrayers(localStorage.getItem("raham-six-prayers") === "1");
    read();
    window.addEventListener("raham-settings", read);
    return () => window.removeEventListener("raham-settings", read);
  }, []);
  const [tawbah, setTawbah] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);
  const [workSeconds, setWorkSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionLength, setSessionLength] = useState(25);
  const [workLabel, setWorkLabel] = useState("Focused coding");
  const endAt = useRef(0);
  const startSeconds = useRef(1500);
  const [now, setNow] = useState<Date | null>(null);
  // On phones the Deep work timer is shown in the Progress tab instead of Today.
  const [mobileDeep, setMobileDeep] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const pick = () => setMobileDeep(mq.matches ? document.getElementById("mobile-deepwork") : null);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, []);
  const [location, setLocation] = useState("Sample prayer times");
  const [locating, setLocating] = useState(false);
  const [repairChecks, setRepairChecks] = useState<boolean[]>([false, false, false, false]);
  const [relapseIndex, setRelapseIndex] = useState(1);
  const [files, setFiles] = useState<(File | null)[]>([null, null]);
  const [uploading, setUploading] = useState(false);
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [prepType, setPrepType] = useState<"DSA" | "System Design">("DSA");
  const [prepTopic, setPrepTopic] = useState("");
  const [prepDifficulty, setPrepDifficulty] = useState("Medium");
  const [prepLink, setPrepLink] = useState("");
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [exerciseMinutes, setExerciseMinutes] = useState(day.exerciseMinutes);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setWorkSeconds(remaining);
      if (remaining === 0) {
        setRunning(false);
        void update({
          ...day,
          workMinutes: day.workMinutes + sessionLength,
          sessions: [
            ...day.sessions,
            {
              label: workLabel,
              minutes: sessionLength,
              time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
            },
          ],
        });
        toast.success("Session complete. Rest, then return with intention.");
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, day, sessionLength, workLabel, update]);
  const next = now
    ? day.prayers.find((p) => {
        if (p.name === "Tahajjud") return false;
        const t = new Date(`${date}T${p.time}:00`);
        return t > now;
      })
    : null;
  const nextTime = now && next ? new Date(`${date}T${next.time}:00`) : null;
  const countdown =
    now && nextTime ? Math.max(0, Math.floor((nextTime.getTime() - now.getTime()) / 1000)) : 0;
  const prayerDone = day.prayers.filter(
    (p) => p.status === "On time" || p.status === "Late",
  ).length;
  const kept = day.guardrails.filter(Boolean).length;
  function setPrayerStatus(name: string, status: "Pending" | "On time" | "Late" | "Missed") {
    void update({
      ...day,
      prayers: day.prayers.map((prayer) => prayer.name === name ? { ...prayer, status } : prayer),
    });
  }
  async function locate() {
    if (!navigator.geolocation) {
      toast.error("Location is unavailable in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://api.aladhan.com/v1/timings/${date.split("-").reverse().join("-")}?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&method=3`,
          );
          if (!response.ok) throw new Error("Prayer times are unavailable. Try again later.");
          const data = (await response.json()) as {
            data?: { timings?: Record<string, string>; meta?: { timezone?: string } };
          };
          const timings = data.data?.timings;
          if (!timings) throw new Error("Prayer times could not be read.");
          await update({
            ...day,
            prayers: day.prayers.map((p) => ({
              ...p,
              time: p.name === "Tahajjud" ? p.time : (timings[p.name] ?? p.time).slice(0, 5),
            })),
          });
          setLocation(data.data?.meta?.timezone ?? "Your location · MWL");
          toast.success("Local prayer times updated (Muslim World League).");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Prayer time lookup failed.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error("Location permission was denied. You can still log your prayers manually.");
      },
    );
  }
  async function uploadProof() {
    if (!user) {
      onAuth();
      return;
    }
    if (!files[0] || !files[1]) {
      toast.error("Choose both the masjid timer and date photos.");
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10 * 1024 * 1024
        )
          throw new Error("Choose a JPG, PNG or WebP photo smaller than 10 MB.");
        const path = `${user.id}/${date}/${crypto.randomUUID()}`;
        const { error } = await supabase.storage
          .from("fajr-proof")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        uploaded.push(path);
      }
      await update({
        ...day,
        proof: [
          ...day.proof,
          ...uploaded.map((path, i) => ({ path, kind: i === 0 ? "Masjid timer" : "Date photo" })),
        ],
      });
      toast.success(
        "Both photos saved privately. Prayer status is logged by you, not automatically verified.",
      );
      setProofOpen(false);
      setFiles([null, null]);
    } catch (e) {
      if (uploaded.length) await supabase.storage.from("fajr-proof").remove(uploaded);
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  async function showProof() {
    setProofOpen(true);
    if (!user) return;
    const urls = await Promise.all(
      day.proof.map(async (p) => {
        const { data } = await supabase.storage.from("fajr-proof").createSignedUrl(p.path, 300);
        return data?.signedUrl ?? "";
      }),
    );
    setProofImages(urls.filter(Boolean));
  }
  function finishSession() {
    const elapsed = Math.floor((startSeconds.current - workSeconds) / 60);
    setRunning(false);
    if (elapsed < 1) {
      toast.info("Complete at least one minute before logging a session.");
      return;
    }
    void update({
      ...day,
      workMinutes: day.workMinutes + elapsed,
      sessions: [
        ...day.sessions,
        {
          label: workLabel,
          minutes: elapsed,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    });
    setWorkSeconds(sessionLength * 60);
    startSeconds.current = sessionLength * 60;
    toast.success(`${elapsed} focused minutes logged.`);
  }
  const sampleScores = [7.4, 8.1, 6.6, 8.7, 7.8, 8.4, score];
  const actualDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() - 6 + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1),
      score: history[key] ? scoreDay(history[key]).score : 0,
    };
  });
  const deepWork = (
        <Panel
          title="Deep work"
          icon={<Code2 />}
          action={
            <span className="pill muted-pill">
              <span className="size-1.5 rounded-full bg-violet-soft" />
              {running ? "Focusing" : "Ready to focus"}
            </span>
          }
        >
          <div className="px-[22px] pb-5">
            <p className="timer-number">
              {String(Math.floor(workSeconds / 60)).padStart(2, "0")}
              <span className="text-muted-foreground">:</span>
              {String(workSeconds % 60).padStart(2, "0")}
            </p>
            <div className="flex justify-center gap-2 mb-5">
              {[25, 50, 90].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={sessionLength === n ? "secondary" : "ghost"}
                  className="h-6 text-[9px] px-2"
                  disabled={running}
                  onClick={() => {
                    setSessionLength(n);
                    setWorkSeconds(n * 60);
                    startSeconds.current = n * 60;
                  }}
                >
                  {n} min
                </Button>
              ))}
            </div>
            <input
              aria-label="Focus session task"
              className="field text-center mb-3"
              value={workLabel}
              onChange={(e) => setWorkLabel(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="glow"
                className="flex-1 h-9 text-[11px]"
                onClick={() => {
                  if (running) setRunning(false);
                  else {
                    endAt.current = Date.now() + workSeconds * 1000;
                    setRunning(true);
                  }
                }}
              >
                {running ? <Pause /> : <Play />}
                {running ? "Pause session" : "Start focus session"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Reset timer"
                aria-label="Reset timer"
                onClick={() => {
                  setRunning(false);
                  setWorkSeconds(sessionLength * 60);
                  startSeconds.current = sessionLength * 60;
                }}
              >
                <RotateCcw />
              </Button>
            </div>
            {workSeconds < sessionLength * 60 && (
              <Button
                variant="link"
                size="sm"
                className="w-full text-xs mt-1"
                onClick={finishSession}
              >
                Finish & log session
              </Button>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground mt-5 mb-2">
              <span>Focused time today</span>
              <span className="font-mono">{formatMinutes(day.workMinutes)}</span>
            </div>
            <ProgressLine value={Math.min(100, (day.workMinutes / 360) * 100)} />
            {day.sessions.length > 0 && (
              <div className="mt-4 border-t border-border pt-3 space-y-2">
                {day.sessions.slice(-2).map((s, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground truncate max-w-[70%]">{s.label}</span>
                    <span className="font-mono">{s.minutes}m</span>
                  </div>
                ))}
              </div>
            )}
            {day.careerRoadmap && (
              <p className="text-xs text-violet-soft mt-4">Learning · {day.careerRoadmap}</p>
            )}
          </div>
        </Panel>
  );
  return (
    <div className="enter-view">
      <Reminder date={date} />
      <div className="stat-grid">
        {[
          {
            label: "TODAY’S RAHAM",
            value: score.toFixed(1),
            suffix: "/ 10",
            icon: Target,
            detail: verdict(score),
            gold: true,
          },
          {
            label: "PRAYERS OFFERED",
            value: `${prayerDone}`,
            suffix: "/ 6",
            icon: Moon,
            detail: "Every prayer is a return to Him.",
          },
          {
            label: "TARGETS FINISHED",
            value: `${tasksDone}`,
            suffix: `/ ${tasksTotal}`,
            icon: ListChecks,
            detail: tasksTotal
              ? `${Math.max(0, tasksTotal - tasksDone)} still open`
              : "Set your first target in My plan",
          },
          {
            label: "PRAYER STREAK",
            value: `${prayerStreak(history, date, sixPrayers).current}`,
            suffix: "days",
            icon: Flame,
            detail: sixPrayers ? "Six prayers, incl. Tahajjud" : "Five obligatory prayers",
          },
        ].map((s) => (
          <section className="panel stat-card" key={s.label}>
            <div className="flex items-center justify-between">
              <span className="eyebrow">{s.label}</span>
              <s.icon size={15} className={s.gold ? "text-gold" : "text-violet-soft"} />
            </div>
            <p className={`stat-value ${s.gold ? "text-gold" : ""}`}>
              {s.value}
              <span className="text-[11px] text-muted-foreground ml-2 font-sans">{s.suffix}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{s.detail}</p>
          </section>
        ))}
      </div>
      <Panel
        title="Today’s targets"
        icon={<ListChecks />}
        className="mb-5"
        action={
          <span className="pill">
            {tasksDone} of {tasksTotal} done
          </span>
        }
      >
        <div className="px-[22px] pb-5 pt-3">
          {tasksTotal ? (
            <>
              <ProgressLine value={(tasksDone / tasksTotal) * 100} />
              <p className="hold-hint">Hold a target to set its time or fixed daily count.</p>
              <div className="mt-4 grid gap-2">
                {day.tasks.map((t) => (
                  <HoldToSet
                    className={`plan-row ${t.countTo ? "has-count" : ""} ${taskIsDone(t) ? "is-done" : ""} ${t.missed ? "is-missed" : ""}`}
                    key={t.id}
                    label={`${t.name}. Hold or press Enter to set this target`}
                    onHold={() => setEditingTask(t)}
                  >
                    {t.countTo ? (
                      <input
                        className="field count-fill"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`How many ${t.name} completed today`}
                        placeholder="0"
                        value={t.count || ""}
                        onChange={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value.replace(/\D/g, "")) || 0));
                          void update({ ...day, tasks: day.tasks.map((x) => (x.id === t.id ? { ...x, count: n, missed: false } : x)) });
                        }}
                      />
                    ) : (
                      <input
                        className="prayer-check"
                        type="checkbox"
                        aria-label={`Mark ${t.name} done`}
                        checked={t.done}
                        onChange={(e) =>
                          void update({
                            ...day,
                            tasks: day.tasks.map((x) =>
                              x.id === t.id ? { ...x, done: e.target.checked, missed: false } : x,
                            ),
                          })
                        }
                      />
                    )}
                    <span className="plan-row-name">{t.name}</span>
                    <span className="plan-row-time font-mono text-[10px] text-muted-foreground">
                      <span className="task-mark" data-mark={taskPoints(t) > 0 ? "positive" : taskPoints(t) < 0 ? "negative" : "open"} title="Target marks">
                        {taskPoints(t) > 0 ? "+1" : taskPoints(t) < 0 ? "−1" : "0"}
                      </span>
                      {t.from}–{t.to}
                      {t.countTo ? ` · ${Math.min(t.count, t.countTo)}/${t.countTo}` : ""}
                    </span>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Set ${t.name} target`} onClick={() => setEditingTask(t)}>
                      <Settings2 size={14} />
                    </Button>
                  </HoldToSet>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground py-3">
              No targets yet. Open My plan and write the first thing you intend to finish today.
            </p>
          )}
        </div>
      </Panel>
      <div className="dashboard-grid">
        <Panel
          title="Prayer tracker"
          icon={<Moon />}
          action={<span className="pill">{prayerDone} of 6</span>}
        >
          <div className="px-[22px] pt-4 pb-5">
            {(() => {
              const ps = prayerStreak(history, date, sixPrayers);
              return (
                <div className="prayer-streak flex items-center justify-between gap-3 mb-3 rounded-lg border border-border px-3 py-2">
                  <p className="text-[11px] flex items-center gap-1.5">
                    <Flame size={12} className="text-violet-soft" />
                    <span className="font-display text-[15px]">{ps.current}</span> day prayer streak
                    <span className="text-muted-foreground text-[9px]">· best {ps.longest}</span>
                  </p>
                  <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {sixPrayers ? "6 incl. Tahajjud" : "5 obligatory"}
                    <Switch
                      aria-label="Count Tahajjud in prayer streak"
                      checked={sixPrayers}
                      onCheckedChange={(v) => {
                        setSixPrayers(v);
                        localStorage.setItem("raham-six-prayers", v ? "1" : "0");
                        window.dispatchEvent(new Event("raham-settings"));
                      }}
                    />
                  </label>
                </div>
              );
            })()}
            <div className="flex items-center justify-between mb-1">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[10px] text-muted-foreground"
                onClick={() => void locate()}
                disabled={locating}
              >
                <MapPin size={11} />
                {locating ? "Finding local times…" : location}
              </Button>
              <span className="text-[9px] text-muted-foreground">MWL</span>
            </div>
            <p className="hold-hint">Hold a prayer for quick status choices.</p>
            {day.prayers.map((p, i) => {
              const Icon = prayerIcons[i] ?? Moon;
              const marks = prayerPoints(p);
              return (
                <HoldToSet
                  className={`prayer-row ${prayerMenu === p.name ? "is-holding" : ""}`}
                  key={p.name}
                  label={`${p.name}. Hold or press Enter to set prayer status`}
                  onHold={() => setPrayerMenu(prayerMenu === p.name ? null : p.name)}
                >
                  <div className="prayer-name">
                    <p className="text-[18px] font-medium flex items-center gap-2.5">
                      <Icon size={17} className="text-muted-foreground" />
                      {p.name}
                      <span className="prayer-mark" data-mark={marks > 0 ? "positive" : marks < 0 ? "negative" : "open"} title="Prayer marks">
                        {marks > 0 ? `+${marks}` : marks}
                      </span>
                    </p>
                    {p.name === "Tahajjud" && (
                      <span className="block text-[12px] text-muted-foreground ml-7">
                        Voluntary night prayer
                      </span>
                    )}
                  </div>
                  <input
                    aria-label={`${p.name} logged time`}
                    title={`Scheduled ${p.time} · actual time logged`}
                    className="prayer-time bg-transparent w-[110px] border-0 text-[17px]"
                    type="time"
                    value={p.loggedAt || p.time}
                    onChange={(e) =>
                      void update({
                        ...day,
                        prayers: day.prayers.map((x) =>
                          x.name === p.name ? { ...x, loggedAt: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <select
                    aria-label={`${p.name} status`}
                    className="status-select"
                    data-status={p.status}
                    value={p.status}
                    onChange={(e) => {
                      const status = e.target.value;
                      if (status !== "Pending" && status !== "On time" && status !== "Late" && status !== "Missed") return;
                      setPrayerStatus(p.name, status);
                    }}
                  >
                    <option>Pending</option>
                    <option>On time</option>
                    <option>Late</option>
                    <option>Missed</option>
                  </select>
                  {prayerMenu === p.name && (
                    <div className="hold-status-menu" role="group" aria-label={`Set ${p.name} status`}>
                      {(["On time", "Late", "Missed", "Pending"] as const).map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={p.status === status ? "secondary" : "ghost"}
                          className="hold-status-choice"
                          data-status={status}
                          aria-pressed={p.status === status}
                          aria-label={status === "Pending" ? "Clear" : status}
                          onClick={() => { setPrayerStatus(p.name, status); setPrayerMenu(null); }}
                        >
                          {status === "Pending" ? "Clear" : status}
                          <span className="menu-mark">{prayerPoints({ ...p, status }) > 0 ? `+${prayerPoints({ ...p, status })}` : prayerPoints({ ...p, status })}</span>
                        </Button>
                      ))}
                      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Close prayer status menu" onClick={() => setPrayerMenu(null)}>
                        <X size={14} />
                      </Button>
                    </div>
                  )}
                </HoldToSet>
              );
            })}
            <div className="flex justify-between mt-4 text-[10px]">
              <span className="text-muted-foreground">
                {next ? (
                  <>
                    Next · <span className="text-foreground">{next.name}</span>
                  </>
                ) : (
                  "Next prayer · Fajr tomorrow"
                )}
              </span>
              <span className="font-mono text-violet-soft">
                {next
                  ? `${String(Math.floor(countdown / 3600)).padStart(2, "0")}:${String(Math.floor(countdown / 60) % 60).padStart(2, "0")}:${String(countdown % 60).padStart(2, "0")}`
                  : "Tomorrow"}
              </span>
            </div>
          </div>
        </Panel>
        <Panel
          title="Nafs & purity"
          icon={<ShieldCheck />}
          action={<span className="pill muted-pill">{kept}/7 kept</span>}
        >
          <div className="px-[22px] pt-3 pb-5">
            {GUARDRAILS.map((name, i) => {
              const s = streak(history, i, date);
              return (
                <div className="guardrail-row" key={name}>
                  <div>
                    <p className="text-[12px]">{name}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Flame size={10} className="text-violet-soft" />
                      <span className="text-gold font-semibold">{s.current * HABIT_POINTS_PER_DAY} pts</span>
                      <span className="ml-1">· {s.current} days · best {s.longest}</span>
                      {i === 6 && day.exerciseMinutes > 0 && (
                        <span>· {day.exerciseMinutes} min</span>
                      )}
                    </p>
                  </div>
                  <Switch
                    aria-label={name}
                    checked={day.guardrails[i] === true}
                    onCheckedChange={(kept) => {
                      void update({
                        ...day,
                        guardrails: day.guardrails.map((x, j) => (j === i ? kept : x)),
                      });
                      if (i === 6 && kept) {
                        setExerciseMinutes(day.exerciseMinutes || 30);
                        setExerciseOpen(true);
                      }
                    }}
                  />
                </div>
              );
            })}
            {(() => {
              const b = badgeProgress(history, date, GUARDRAILS.length);
              return (
                <div className="mt-4 rounded-lg border border-border p-3">
                  <p className="eyebrow mb-2">Milestones · <span className="text-gold">{b.total} pts</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.badges.map((m) => {
                      const got = b.total >= m.points;
                      return (
                        <span
                          key={m.name}
                          title={`${m.points} points`}
                          className={`text-[10px] rounded-full border px-2 py-1 transition-all duration-500 ${got ? "badge-earned border-gold text-gold animate-in zoom-in-75" : "border-border text-muted-foreground opacity-50"}`}
                        >
                          {got ? "★" : "☆"} {m.name} · {m.points}
                        </span>
                      );
                    })}
                  </div>
                  {b.next && (
                    <p className="text-[9px] text-muted-foreground mt-2">
                      {b.next.points - b.total} pts to {b.next.name}
                    </p>
                  )}
                </div>
              );
            })()}
            <Button
              variant="ghost"
              className="text-[10px] text-muted-foreground w-full mt-3 h-8"
              onClick={() => setTawbah(true)}
            >
              <HeartHandshake size={13} />
              Struggling? Return, don’t retreat.
              <ChevronRight size={12} />
            </Button>
          </div>
        </Panel>
        <div>
          <Panel
            title="The balance"
            className="balance-panel"
            icon={<Target />}
            action={<span className="text-[9px] text-muted-foreground">RAHAM SCORE</span>}
          >
            <Ring value={score}>
              <span className="score-number">{score.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground mt-1">OUT OF 10</span>
            </Ring>
            <div className="text-center px-5">
              <p className="text-[12px] font-medium">{verdict(score)}</p>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Not perfection. Sincere effort, measured honestly.
              </p>
            </div>
            <div className="px-[22px] py-5 space-y-3">
              {[
                { name: "Prayers", value: pillars.prayers, weight: "50%" },
                { name: "Commitments", value: pillars.purity, weight: "35%" },
                { name: "Targets", value: pillars.targets, weight: "15%" },
              ].map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="text-muted-foreground font-mono">{p.weight}</span>
                  </div>
                  <ProgressLine value={p.value * 100} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <div className="dashboard-bottom">
        {mobileDeep ? createPortal(deepWork, mobileDeep) : deepWork}
        <Panel
          title="Your consistency"
          icon={<Flame />}
          action={
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              title="View consistency"
              aria-label="View consistency"
              onClick={onAnalytics}
            >
              <ArrowUpRight />
            </Button>
          }
        >
          <div className="px-[22px] pb-5">
            <div className="flex justify-between items-end mt-5">
              <div>
                <p className="font-mono text-[24px]">
                  {user ? actualDays.filter((d) => d.score > 0).length : 7}
                  <span className="text-xs text-muted-foreground font-sans ml-2">active days</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {user ? "This week" : "Sample week"}
                </p>
              </div>
              <span className="text-gold">
                <Sparkles size={22} />
              </span>
            </div>
            <div className="bar-chart">
              {actualDays.map((d, i) => (
                <div className="bar-col" key={i}>
                  <div
                    className="bar-fill"
                    style={{ height: `${(user ? d.score : (sampleScores[i] ?? 0)) * 10}px` }}
                  />
                  <span className="bar-label">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] flex items-center gap-2">
                <ShieldCheck size={13} className="text-violet-soft" />
                Protect your next prayer.
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Consistency is built in the moments nobody sees.
              </p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-5 mt-5">
        <Panel
          title="Interview readiness"
          icon={<BookOpen />}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-violet-soft"
              onClick={() => setPrepOpen(true)}
            >
              <Plus size={12} />
              Log prep
            </Button>
          }
        >
          <div className="p-[22px]">
            <div className="flex gap-6 mb-4">
              <div>
                <p className="font-mono text-xl">
                  {day.prep.filter((p) => p.type === "DSA").length}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">DSA problems</p>
              </div>
              <div>
                <p className="font-mono text-xl">
                  {day.prep.filter((p) => p.type === "System Design").length}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Design topics</p>
              </div>
            </div>
            {day.prep.slice(-3).map((p, i) => (
              <div
                key={i}
                className="text-[11px] flex items-start gap-2 py-2 border-t border-border"
              >
                <CheckCircle2 size={13} className="text-success shrink-0 mt-0.5" />
                <div>
                  <p>{p.topic}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {p.type} · {p.difficulty}
                    {p.link && (
                      <a
                        className="text-violet-soft ml-2"
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source ↗
                      </a>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {!day.prep.length && (
              <p className="text-xs text-muted-foreground">
                A small problem today. A stronger engineer tomorrow.
              </p>
            )}
          </div>
        </Panel>
        <Panel
          title="An honest moment"
          icon={<BookOpen />}
          action={<span className="eyebrow">DAILY REFLECTION</span>}
        >
          <div className="p-[22px] grid sm:grid-cols-3 gap-4">
            {["What did I do well?", "Where did my Nafs win?", "My plan for tomorrow"].map(
              (question, i) => (
                <label className="text-[11px]" key={question}>
                  {question}
                  <textarea
                    aria-label={question}
                    className="field mt-3 resize-none min-h-[100px]"
                    placeholder={
                      i === 0
                        ? "The quiet wins count, too…"
                        : i === 1
                          ? "Be honest. There is a way back…"
                          : "One clear intention…"
                    }
                    value={day.reflection[i] ?? ""}
                    onChange={(e) =>
                      void update({
                        ...day,
                        reflection: day.reflection.map((s, j) => (j === i ? e.target.value : s)),
                      })
                    }
                  />
                </label>
              ),
            )}
          </div>
        </Panel>
      </div>
      <TaskTargetDialog
        task={editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        onSave={(next) => update({ ...day, tasks: day.tasks.map((task) => task.id === next.id ? next : task) })}
      />
      <Dialog open={tawbah} onOpenChange={setTawbah}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Return, don’t retreat.</DialogTitle>
            <DialogDescription>
              A lapse is not your identity. Own it, stop it, and take the next sincere step.
            </DialogDescription>
          </DialogHeader>
          <label className="text-xs grid gap-2">
            Which commitment was broken?
            <select
              className="field"
              value={relapseIndex}
              onChange={(e) => setRelapseIndex(Number(e.target.value))}
            >
              {GUARDRAILS.map((g, i) => (
                <option key={g} value={i}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-4 my-2">
            {[
              "Stop the action and remove the trigger.",
              "Make sincere tawbah; consider two rak‘ahs of voluntary prayer.",
              "Say Astaghfirullah 100 times with attention.",
              "Urge-surf for 10 minutes: breathe, move away, and let the urge pass.",
            ].map((s, i) => (
              <label className="flex items-start gap-3 text-xs leading-relaxed" key={s}>
                <input
                  className="prayer-check mt-0.5 shrink-0"
                  type="checkbox"
                  checked={repairChecks[i] ?? false}
                  onChange={(e) =>
                    setRepairChecks((old) => old.map((x, j) => (j === i ? e.target.checked : x)))
                  }
                />
                {s}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Repair harm to others where needed. Your streak resets honestly; your longest streak
            remains.
          </p>
          <Button
            variant="glow"
            onClick={() => {
              void update({
                ...day,
                guardrails: day.guardrails.map((x, i) => (i === relapseIndex ? false : x)),
              });
              setTawbah(false);
              toast.success("Logged honestly. Begin again with your next action.");
            }}
          >
            Log relapse & recommit
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={exerciseOpen} onOpenChange={setExerciseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exercise minutes</DialogTitle>
            <DialogDescription>Care for the body entrusted to you.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-xs">
            Minutes
            <input
              type="number"
              min={0}
              max={1440}
              className="field"
              value={exerciseMinutes}
              onChange={(e) => setExerciseMinutes(Number(e.target.value))}
            />
          </label>
          <Button
            variant="glow"
            onClick={() => {
              void update({
                ...day,
                exerciseMinutes: Math.max(0, exerciseMinutes),
                guardrails: day.guardrails.map((x, i) => (i === 6 ? exerciseMinutes > 0 : x)),
              });
              setExerciseOpen(false);
            }}
          >
            Log exercise
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={prepOpen} onOpenChange={setPrepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log interview prep</DialogTitle>
            <DialogDescription>
              Practice deliberately. Record what you actually completed.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (prepLink && !/^https?:\/\//.test(prepLink)) {
                toast.error("Use a full https link.");
                return;
              }
              void update({
                ...day,
                prep: [
                  ...day.prep,
                  { type: prepType, topic: prepTopic, difficulty: prepDifficulty, link: prepLink },
                ],
              });
              setPrepOpen(false);
              setPrepTopic("");
              setPrepLink("");
              toast.success("Interview practice logged.");
            }}
          >
            <label className="grid gap-2 text-xs">
              Practice type
              <select
                className="field"
                value={prepType}
                onChange={(e) => setPrepType(e.target.value === "DSA" ? "DSA" : "System Design")}
              >
                <option>DSA</option>
                <option>System Design</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs">
              Problem or topic
              <input
                required
                className="field"
                value={prepTopic}
                onChange={(e) => setPrepTopic(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-xs">
              Difficulty
              <select
                className="field"
                value={prepDifficulty}
                onChange={(e) => setPrepDifficulty(e.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs">
              Source link (optional)
              <input
                type="url"
                className="field"
                value={prepLink}
                onChange={(e) => setPrepLink(e.target.value)}
              />
            </label>
            <Button variant="glow" type="submit">
              <Check />
              Save practice
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
