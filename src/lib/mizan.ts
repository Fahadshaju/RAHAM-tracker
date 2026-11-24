import { z } from "zod";

export const PRAYER_NAMES = ["Tahajjud", "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export const GUARDRAILS = [
  "Lowered gaze",
  "NNN-free",
  "Quran listening discipline",
  "No music",
  "No refined sugar",
  "No social scrolling",
  "Physical exercise",
  "Quran read",
];
export const prayerSchema = z.object({
  name: z.enum(PRAYER_NAMES),
  time: z.string(),
  status: z.enum(["Pending", "On time", "Late", "Missed"]),
  loggedAt: z.string().default(""),
});
export const taskSchema = z.object({
  id: z.string(),
  name: z.string(),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
  done: z.boolean().default(false),
  /** How many times it has been done so far. */
  count: z.number().int().min(0).default(0),
  /** The number you fix for it. 0 means the target is finished by ticking it. */
  countTo: z.number().int().min(0).default(0),
  /** Explicitly missed targets lose a mark; open targets have no negative mark. */
  missed: z.boolean().optional(),
  seriesId: z.string().optional(),
});
export const repeatPlanSchema = z.object({
  task: taskSchema,
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  endMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  frequency: z.enum(["daily", "weekdays"]),
}).superRefine((plan, ctx) => {
  if (plan.endMonth < plan.startMonth) ctx.addIssue({ code: "custom", message: "End month must follow the start month." });
  const distance = (Number(plan.endMonth.slice(0, 4)) - Number(plan.startMonth.slice(0, 4))) * 12 + Number(plan.endMonth.slice(5)) - Number(plan.startMonth.slice(5));
  if (distance > 119) ctx.addIssue({ code: "custom", message: "Choose a range of ten years or less." });
  if (plan.task.to <= plan.task.from) ctx.addIssue({ code: "custom", message: "End time must follow the start time." });
});
export type RepeatPlan = z.infer<typeof repeatPlanSchema>;

/** Expand whole targeted months; each date owns an independent completion state. */
export function repeatDates(input: RepeatPlan) {
  const plan = repeatPlanSchema.parse(input);
  const cursor = new Date(`${plan.startMonth}-01T12:00:00Z`);
  const dates: string[] = [];
  while (cursor.toISOString().slice(0, 7) <= plan.endMonth) {
    if (plan.frequency === "daily" || (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6)) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
export function addRepeatingTask(day: Day, task: Task, date: string): Day {
  const seriesId = task.seriesId ?? task.id;
  if (day.tasks.some((t) => t.seriesId === seriesId)) return day;
  return { ...day, tasks: [...day.tasks, { ...task, id: `${seriesId}:${date}`, seriesId, done: false, count: 0, missed: false }] };
}
export const daySchema = z.object({
  tasks: z.array(taskSchema).default([]),
  prayers: z.array(prayerSchema).length(6),
  // Older saved days have 7 habits; pad them so every day carries one slot per habit.
  guardrails: z.preprocess(
    (v) => (Array.isArray(v) && v.length < GUARDRAILS.length ? [...v, ...Array(GUARDRAILS.length - v.length).fill(null)] : v),
    z.array(z.boolean().nullable()).length(GUARDRAILS.length),
  ),
  istighfar: z.number().min(0),
  target: z.number().min(1000).max(100000),
  dhikr: z.array(z.number().min(0)).length(4),
  workMinutes: z.number().min(0),
  exerciseMinutes: z.number().min(0),
  sessions: z.array(z.object({ label: z.string(), minutes: z.number(), time: z.string() })),
  prep: z.array(
    z.object({
      type: z.enum(["DSA", "System Design"]),
      topic: z.string(),
      difficulty: z.string(),
      link: z.string(),
    }),
  ),
  reflection: z.array(z.string()).length(3),
  proof: z.array(z.object({ path: z.string(), kind: z.string() })),
  blocks: z.array(
    z.object({
      name: z.string(),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      minutes: z.number().min(1).max(1440),
    }),
  ),
  careerRoadmap: z.string().default(""),
});
export type Day = z.infer<typeof daySchema>;
export type Prayer = Day["prayers"][number];
export type Block = Day["blocks"][number];
export type Task = Day["tasks"][number];

/** A numbered target is finished when its count reaches the number you fixed. */
export function taskIsDone(task: Task) {
  return task.countTo ? task.count >= task.countTo : task.done;
}
/** Finished targets earn one mark; only an explicitly missed target loses one. */
export function taskPoints(task: Task) {
  if (taskIsDone(task)) return 1;
  return task.missed ? -1 : 0;
}
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function makeDay(sample = false): Day {
  return {
    tasks: sample
      ? [
          {
            id: "s1",
            name: "Fajr in the masjid",
            from: "04:30",
            to: "05:15",
            done: true,
            count: 0,
            countTo: 0,
          },
          {
            id: "s2",
            name: "Deep work · React architecture",
            from: "08:00",
            to: "11:00",
            done: true,
            count: 0,
            countTo: 0,
          },
          {
            id: "s3",
            name: "Istighfar",
            from: "20:00",
            to: "21:00",
            done: false,
            count: 420,
            countTo: 1000,
          },
          {
            id: "s4",
            name: "Quran listening walk",
            from: "17:30",
            to: "18:00",
            done: false,
            count: 0,
            countTo: 0,
          },
        ]
      : [],
    prayers: PRAYER_NAMES.map((name, i) => ({
      name,
      time: ["04:40", "05:12", "12:35", "15:48", "18:05", "19:20"][i] ?? "00:00",
      status: sample && i < 3 ? "On time" : "Pending",
      loggedAt: sample && i < 3 ? (["04:40", "05:12", "12:35"][i] ?? "") : "",
    })),
    guardrails: sample
      ? [true, true, true, true, false, true, true, true]
      : Array.from({ length: GUARDRAILS.length }, () => null),
    istighfar: sample ? 750 : 0,
    target: 1000,
    dhikr: sample ? [33, 33, 34, 100] : [0, 0, 0, 0],
    workMinutes: sample ? 210 : 0,
    exerciseMinutes: sample ? 25 : 0,
    sessions: sample
      ? [
          { label: "React architecture", minutes: 120, time: "08:00" },
          { label: "DSA · sliding window", minutes: 90, time: "10:30" },
        ]
      : [],
    prep: sample
      ? [
          {
            type: "DSA",
            topic: "Longest substring without repeating characters",
            difficulty: "Medium",
            link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
          },
        ]
      : [],
    reflection: ["", "", ""],
    proof: [],
    blocks: [
      ...PRAYER_NAMES.map((name, i) => ({
        name,
        time: ["04:40", "05:12", "12:35", "15:48", "18:05", "19:20"][i] ?? "00:00",
        minutes: 20,
      })),
      { name: "Deep work", time: "08:00", minutes: 360 },
      { name: "Exercise", time: "17:00", minutes: 30 },
      { name: "Interview prep", time: "20:00", minutes: 60 },
    ],
    careerRoadmap: "",
  };
}
export function prayerPoints(p: Prayer): number {
  if (p.status === "Missed") return -12;
  if (p.status === "Late") return 4;
  if (p.status === "On time") return p.name === "Fajr" || p.name === "Tahajjud" ? 15 : 10;
  return 0;
}
export function guardrailPoints(kept: boolean | null) {
  return kept === true ? 5 : kept === false ? -5 : 0;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** A day is judged on three things only: prayers kept, commitments kept, targets finished. */
export const PILLAR_WEIGHTS = { prayers: 0.5, purity: 0.35, targets: 0.15 } as const;
export function scoreDay(day: Day) {
  // Unlogged commitments earn no credit; negative point totals floor at zero.
  const total = day.tasks.length;
  const done = day.tasks.filter(taskIsDone).length;
  const pillars = {
    prayers: clamp(day.prayers.reduce((s, p) => s + prayerPoints(p), 0) / 70),
    purity: clamp(day.guardrails.reduce<number>((s, k) => s + guardrailPoints(k), 0) / (GUARDRAILS.length * 5)),
    targets: total ? clamp(done / total) : 0,
  };
  // With no targets set yet, their share is shared between the two that remain.
  const weights = total
    ? PILLAR_WEIGHTS
    : {
        prayers: PILLAR_WEIGHTS.prayers / 0.85,
        purity: PILLAR_WEIGHTS.purity / 0.85,
        targets: 0,
      };
  const score =
    Math.round(
      (pillars.prayers * weights.prayers +
        pillars.purity * weights.purity +
        pillars.targets * weights.targets) *
        100,
    ) / 10;
  return {
    score,
    pillars,
    weights,
    tasksDone: done,
    tasksTotal: total,
    points:
      day.prayers.reduce((s, p) => s + prayerPoints(p), 0) +
      day.guardrails.reduce<number>((s, k) => s + guardrailPoints(k), 0),
  };
}
export function verdict(score: number) {
  return score >= 9
    ? "Mashallah. Keep going at this pace."
    : score >= 7
      ? "A good day. Finish what is still open."
      : score >= 4
        ? "The day is not over. Take the next small step."
        : "Begin again. One sincere step is enough.";
}
export function streak(history: Record<string, Day>, index: number, today: string) {
  const entries = Object.entries(history)
    .filter(([key]) => key <= today)
    .sort(([a], [b]) => a.localeCompare(b));
  let longest = 0,
    run = 0,
    prior = "";
  for (const [key, day] of entries) {
    const prev = new Date(`${key}T12:00:00`);
    prev.setDate(prev.getDate() - 1);
    if (prior && dateKey(prev) !== prior) run = 0;
    run = day.guardrails[index] === true ? run + 1 : 0;
    longest = Math.max(longest, run);
    prior = key;
  }
  const last = entries.at(-1);
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    current: last && (last[0] === today || last[0] === dateKey(yesterday)) ? run : 0,
    longest,
  };
}
/** Points per kept day for each commitment. Breaking it (or skipping a day) loses all points. */
export const HABIT_POINTS_PER_DAY = 10;
export function habitPoints(history: Record<string, Day>, index: number, today: string) {
  return streak(history, index, today).current * HABIT_POINTS_PER_DAY;
}
/** Prayer streak: a day counts only when every required prayer is prayed (on time or late).
 * Any missed/unlogged required prayer resets the streak to zero — start again from day one. */
export function prayerStreak(history: Record<string, Day>, today: string, includeTahajjud: boolean) {
  const required = includeTahajjud ? PRAYER_NAMES : PRAYER_NAMES.filter((n) => n !== "Tahajjud");
  const entries = Object.entries(history)
    .filter(([key]) => key <= today)
    .sort(([a], [b]) => a.localeCompare(b));
  let longest = 0,
    run = 0,
    prior = "";
  for (const [key, day] of entries) {
    const prev = new Date(`${key}T12:00:00`);
    prev.setDate(prev.getDate() - 1);
    if (prior && dateKey(prev) !== prior) run = 0;
    const complete = required.every((n) => {
      const st = day.prayers.find((p) => p.name === n)?.status;
      return st === "On time" || st === "Late";
    });
    run = complete ? run + 1 : 0;
    longest = Math.max(longest, run);
    prior = key;
  }
  const last = entries.at(-1);
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    current: last && (last[0] === today || last[0] === dateKey(yesterday)) ? run : 0,
    longest,
  };
}
export function downloadFile(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function calendarICS(blocks: Block[], date: string) {
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const localStamp = (d: Date) =>
    `${dateKey(d).replaceAll("-", "")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RAHAM//Sacred Blocks//EN",
    "CALSCALE:GREGORIAN",
    ...blocks.flatMap((b, i) => {
      const start = new Date(`${date}T${b.time}:00`);
      const end = new Date(start.getTime() + b.minutes * 60000);
      return [
        "BEGIN:VEVENT",
        `UID:mizan-${i}-${date}@mizan.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART:${localStamp(start)}`,
        `DTEND:${localStamp(end)}`,
        `SUMMARY:${escape(b.name)}`,
        "RRULE:FREQ=DAILY",
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ].join("\r\n");
}
export const sourceSchema = z.object({
  videoId: z.string().regex(/^[\w-]{11}$/),
  title: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
});
export const roadmapSchema = z.object({
  title: z.string(),
  goal: z.string(),
  difficulty: z.string(),
  prerequisites: z.array(z.string()),
  watchMinutes: z.number(),
  days: z.number().min(1),
  schedule: z.array(z.object({ day: z.string(), focus: z.string(), hours: z.number() })),
  phases: z.array(
    z.object({
      name: z.enum(["Foundation", "Core", "Advanced", "Mastery"]),
      minutes: z.number(),
      concepts: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          learn: z.string(),
          why: z.string(),
          minutes: z.number(),
          sources: z.array(sourceSchema),
        }),
      ),
      practice: z.array(z.string()),
      project: z.string(),
      questions: z.array(z.string()),
    }),
  ),
  glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
  mistakes: z.array(z.string()),
  capstone: z.string(),
  completed: z.array(z.string()).default([]),
  sourceUrl: z.string().default(""),
  id: z.string().default(""),
  sample: z.boolean().default(false),
});
export type Roadmap = z.infer<typeof roadmapSchema>;
export function transcriptIntervals(text: string): [number, number][] {
  return Array.from(
    text.matchAll(/\[(\d+)\s*[–-]\s*(\d+)s?\]/g),
    (m) => [Number(m[1]), Number(m[2])] as [number, number],
  );
}
export function validateConsolidatedRoadmap(
  roadmap: Roadmap,
  sources: { video: { id: string; duration: number }; ranges: [number, number][] }[],
) {
  const order = ["Foundation", "Core", "Advanced", "Mastery"];
  if (roadmap.phases.length !== 4 || roadmap.phases.some((p, i) => p.name !== order[i]))
    throw new Error(
      "The course did not contain the four dependency-ordered phases. No partial roadmap was saved.",
    );
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const phase of roadmap.phases)
    for (const concept of phase.concepts) {
      const normalized = concept.name.trim().toLowerCase();
      if (ids.has(concept.id) || names.has(normalized))
        throw new Error(
          "The roadmap contained duplicate concepts. No incomplete course was saved.",
        );
      ids.add(concept.id);
      names.add(normalized);
      for (const citation of concept.sources) {
        const source = sources.find((s) => s.video.id === citation.videoId);
        if (!source || citation.end <= citation.start || citation.end > source.video.duration + 1)
          throw new Error(
            "The AI returned invalid source timestamps. No misleading roadmap was saved.",
          );
        const ranges = source.ranges;
        const min = Math.min(...ranges.map((r) => r[0]));
        const max = Math.max(...ranges.map((r) => r[1]));
        if (!ranges.length || citation.start < min || citation.end > max)
          throw new Error(
            "A citation extended beyond the supplied transcript. No invented timestamps were saved.",
          );
      }
    }
  for (const source of sources)
    if (
      !roadmap.phases.some((p) =>
        p.concepts.some((c) => c.sources.some((s) => s.videoId === source.video.id)),
      )
    )
      throw new Error(
        "A video was missing from the synthesis. No partial playlist roadmap was saved.",
      );
}
export function parseYouTube(input: string) {
  const url = new URL(input);
  if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname))
    throw new Error("Enter a valid YouTube video or playlist URL.");
  const playlist = url.searchParams.get("list");
  const video =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})/)?.[1]);
  if (playlist && /^[\w-]+$/.test(playlist)) return { playlist, video: null };
  if (video && /^[\w-]{11}$/.test(video)) return { playlist: null, video };
  throw new Error("This link does not contain a video or playlist.");
}
export function formatMinutes(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}
export function timestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export function roadmapMarkdown(r: Roadmap) {
  return (
    `# ${r.title}\n\n${r.goal}\n\nDifficulty: ${r.difficulty}\nPrerequisites: ${r.prerequisites.join(", ")}\nWatch time: ${formatMinutes(r.watchMinutes)}\nSchedule: ${r.days} days\n\n` +
    r.phases
      .map(
        (p) =>
          `## ${p.name} · ${formatMinutes(p.minutes)}\n\n` +
          p.concepts
            .map(
              (c) =>
                `### ${r.completed.includes(c.id) ? "[x]" : "[ ]"} ${c.name}\n${c.learn}\n\nWhy: ${c.why}\nTime: ${formatMinutes(c.minutes)}\n` +
                c.sources
                  .map(
                    (s) =>
                      `- [${s.title} ${timestamp(s.start)}–${timestamp(s.end)}](https://www.youtube.com/watch?v=${s.videoId}&t=${Math.floor(s.start)}s)`,
                  )
                  .join("\n"),
            )
            .join("\n\n") +
          `\n\nPractice:\n${p.practice.map((t) => `- ${t}`).join("\n")}\nMini-project: ${p.project}\nCheckpoints:\n${p.questions.map((q) => `- ${q}`).join("\n")}`,
      )
      .join("\n\n") +
    `\n\n## Schedule\n${r.schedule.map((s) => `- ${s.day}: ${s.focus} (${s.hours}h)`).join("\n")}\n\n## Glossary\n${r.glossary.map((g) => `- **${g.term}**: ${g.definition}`).join("\n")}\n\n## Common mistakes\n${r.mistakes.map((m) => `- ${m}`).join("\n")}\n\n## Capstone\n${r.capstone}`
  );
}

/**
 * Turns a plain transcript (no timings) into the timestamped shape the synthesis pipeline
 * requires, by spreading the text evenly across the video's known length. Ranges are
 * estimates, never measured cue times, so the caller must label them as such.
 */
export function estimatedTranscript(text: string, durationSeconds: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.match(/[^.!?]+[.!?]*/g) ?? [clean];
  const groups: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    buffer = buffer ? `${buffer} ${s}` : s;
    if (buffer.length >= 320) {
      groups.push(buffer);
      buffer = "";
    }
  }
  if (buffer) groups.push(buffer);
  if (!groups.length) return "";
  const span = durationSeconds > 0 ? durationSeconds / groups.length : 30;
  return groups
    .map((group, i) => `[${Math.floor(i * span)}–${Math.floor((i + 1) * span)}s] ${group}`)
    .join("\n");
}

/** Milestone badges unlock from the combined points of every habit's best run, so a broken day never takes a badge away. */
export const HABIT_BADGES = [
  { points: 50, name: "First Steps" },
  { points: 150, name: "Steadfast" },
  { points: 300, name: "Guardian" },
  { points: 600, name: "Mujahid of the Nafs" },
  { points: 1000, name: "Unshakeable" },
] as const;
export function badgeProgress(history: Record<string, Day>, today: string, habits: number) {
  let total = 0;
  for (let i = 0; i < habits; i++) total += streak(history, i, today).longest * HABIT_POINTS_PER_DAY;
  const earned: { points: number; name: string }[] = [];
  for (let i = 0; habitBadge(i).points <= total; i++) earned.push(habitBadge(i));
  const next = habitBadge(earned.length);
  return { total, earned, next, badges: [...earned, next] };
}
/** Each milestone after the first five gets its own name; when the names run out they repeat with a rank (II, III…). */
export const HABIT_BADGE_NAMES = [
  "Sabr", "Taqwa", "Ihsan", "Ikhlas", "Tawakkul", "Shukr", "Istiqamah", "Zuhd", "Yaqeen", "Khushu",
  "Wara", "Haya", "Mujahadah", "Muraqabah", "Rida", "Mahabbah", "Siddiq", "Muhsin", "Muttaqi", "Wali",
] as const;
const ROMAN = (n: number) => {
  const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, r] of map) while (n >= v) { out += r; n -= v; }
  return out;
};
export function habitBadge(i: number): { points: number; name: string } {
  if (i < HABIT_BADGES.length) return HABIT_BADGES[i]!;
  const k = i - HABIT_BADGES.length;
  const base = HABIT_BADGE_NAMES[k % HABIT_BADGE_NAMES.length]!;
  const round = Math.floor(k / HABIT_BADGE_NAMES.length);
  return { points: 1000 * (k + 2), name: round ? `${base} ${ROMAN(round + 1)}` : base };
}
