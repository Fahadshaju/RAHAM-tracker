import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  GitBranch,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  Youtube,
  X,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, ProgressLine } from "./shared";
import { useMizanAuth } from "./auth";
import {
  formatMinutes,
  parseYouTube,
  roadmapMarkdown,
  roadmapSchema,
  timestamp,
  transcriptIntervals,
  estimatedTranscript,
  type Day,
  type Roadmap,
} from "@/lib/mizan";
import { SAMPLE_ROADMAP } from "@/lib/sample-roadmap";
import {
  readYouTubeCatalog,
  readVideoTranscript,
  summarizeTranscript,
  synthesizeRoadmap,
  transcribeUploadedAudio,
  type VideoInfo,
} from "@/lib/roadmap.functions";
import { supabase } from "@/integrations/supabase/client";
import { downloadFile } from "@/lib/mizan";
import { toast } from "sonner";
import { exportRoadmapPDF } from "@/lib/roadmap-pdf";

type Source = { video: VideoInfo; transcript: string; ranges?: [number, number][] };
export function Roadmaps({
  onAuth,
  day,
  update,
  onCalendar,
}: {
  onAuth: () => void;
  day: Day;
  update: (d: Day) => Promise<void>;
  onCalendar: () => void;
}) {
  const { user } = useMizanAuth();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Roadmap>(SAMPLE_ROADMAP);
  const [expanded, setExpanded] = useState<string[]>(["Foundation", "Core"]);
  const [detail, setDetail] = useState("concepts");
  const [missing, setMissing] = useState<VideoInfo[]>([]);
  const [manual, setManual] = useState<Record<string, string>>({});
  const [transcribing, setTranscribing] = useState("");
  const sources = useRef<Source[]>([]);
  const videosRef = useRef<VideoInfo[]>([]);
  const canceled = useRef(false);
  const [context, setContext] = useState("");
  const readCatalog = useServerFn(readYouTubeCatalog);
  const readTranscript = useServerFn(readVideoTranscript);
  const summarize = useServerFn(summarizeTranscript);
  const synthesize = useServerFn(synthesizeRoadmap);
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ["private", "roadmaps", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mizan_roadmaps")
        .select("id,data")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) =>
        roadmapSchema.parse({ ...roadmapSchema.parse(row.data), id: row.id }),
      );
    },
  });
  useEffect(() => {
    setActive(SAMPLE_ROADMAP);
    setMissing([]);
    setManual({});
    setError("");
  }, [user?.id]);
  async function save(r: Roadmap) {
    if (!user) return r;
    const { data, error } = await supabase
      .from("mizan_roadmaps")
      .insert({ user_id: user.id, title: r.title, data: JSON.parse(JSON.stringify(r)) })
      .select("id")
      .single();
    if (error) throw error;
    const saved = { ...r, id: data.id };
    await queryClient.invalidateQueries({ queryKey: ["private", "roadmaps", user.id] });
    return saved;
  }
  async function merge() {
    setStage("Synthesizing one unified course…");
    setProgress(80);
    const compact: Source[] = [];
    for (const source of sources.current) {
      if (canceled.current) return;
      const chunks = source.transcript.match(/[\s\S]{1,35000}/g) ?? [];
      if (chunks.length > 1) {
        const summaries: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
          if (canceled.current) return;
          setStage(`Summarizing ${source.video.title} · chunk ${i + 1}/${chunks.length}`);
          summaries.push(await summarize({ data: { video: source.video, text: chunks[i] ?? "" } }));
        }
        compact.push({ video: source.video, transcript: summaries.join("\n") });
      } else compact.push(source);
    }
    // A final pass combines every source; never produce a per-video roadmap.
    setStage(`Ordering concepts across ${compact.length} video${compact.length === 1 ? "" : "s"}…`);
    const roadmap = await synthesize({
      data: {
        url,
        sources: compact.map((s) => ({
          ...s,
          ranges: transcriptIntervals(
            sources.current.find((original) => original.video.id === s.video.id)?.transcript ??
              s.transcript,
          ),
        })),
        context,
      },
    });
    if (canceled.current) return;
    setProgress(95);
    setStage("Saving your learning roadmap…");
    const saved = await save(roadmap);
    setActive(saved);
    setExpanded(["Foundation"]);
    setProgress(100);
    setStage("Your unified roadmap is ready.");
    toast.success(
      `One roadmap, synthesized from ${compact.length} video${compact.length === 1 ? "" : "s"}.`,
    );
  }
  async function generate() {
    if (!user) {
      onAuth();
      return;
    }
    setError("");
    setMissing([]);
    setManual({});
    sources.current = [];
    canceled.current = false;
    try {
      parseYouTube(url);
    } catch {
      setError("Enter a full YouTube video or playlist URL.");
      return;
    }
    setBusy(true);
    setProgress(2);
    setStage("Reading playlist and video metadata…");
    try {
      const catalog = await readCatalog({ data: { url } });
      videosRef.current = catalog.videos;
      const absent: VideoInfo[] = [];
      for (let i = 0; i < catalog.videos.length; i++) {
        if (canceled.current) break;
        const video = catalog.videos[i];
        if (!video) continue;
        setStage(`Reading video ${i + 1} of ${catalog.videos.length} · ${video.title}`);
        try {
          const source = await readTranscript({ data: video });
          sources.current.push(source);
        } catch (e) {
          absent.push(video);
          setError(e instanceof Error ? e.message : "Captions unavailable.");
        }
        setProgress(10 + Math.round(((i + 1) / catalog.videos.length) * 60));
      }
      if (canceled.current) {
        setStage("Stopped. No roadmap was generated.");
        return;
      }
      if (absent.length) {
        setMissing(absent);
        setStage(
          `${absent.length} transcript${absent.length === 1 ? "" : "s"} needed before synthesis.`,
        );
        return;
      }
      await merge();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Roadmap generation failed. Your URL is preserved.",
      );
    } finally {
      setBusy(false);
    }
  }
  function toBase64(buf: ArrayBuffer) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }
  async function transcribeFromAudio(video: VideoInfo, file: File) {
    if (file.size > 6_500_000) {
      setError(
        "Keep the audio under about 6 MB — a short clip of the spoken part of the video is enough.",
      );
      return;
    }
    setTranscribing(video.id);
    setError("");
    try {
      const audio = toBase64(await file.arrayBuffer());
      const result = await transcribeUploadedAudio({
        data: { audio, filename: file.name, video },
      });
      setManual((old) => ({ ...old, [video.id]: estimatedTranscript(result.transcript, video.duration) }));
      setStage(
        `Transcribed “${video.title}” automatically. Timings are estimated from the video length, not measured cue times.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} You can still paste a timestamped transcript instead.`
          : "Automatic transcription failed. You can still paste a timestamped transcript instead.",
      );
    } finally {
      setTranscribing("");
    }
  }
  async function continueWithManual() {
    if (missing.some((v) => !manual[v.id]?.trim())) {
      setError("Provide the transcript for every missing video so nothing is left out.");
      return;
    }
    for (const video of missing) {
      const text = manual[video.id] ?? "";
      if (!/\[\d+\s*[–-]\s*\d+s?\]/.test(text)) {
        setError(
          "Use timestamped lines such as [0–120s] transcript text. Exact source ranges are required.",
        );
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      sources.current.push(
        ...missing.map((video) => ({ video, transcript: manual[video.id] ?? "" })),
      );
      setMissing([]);
      await merge();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not synthesize these transcripts.");
    } finally {
      setBusy(false);
    }
  }
  async function toggleConcept(id: string) {
    const next = {
      ...active,
      completed: active.completed.includes(id)
        ? active.completed.filter((x) => x !== id)
        : [...active.completed, id],
    };
    setActive(next);
    if (user && !active.sample) {
      const { error } = await supabase
        .from("mizan_roadmaps")
        .update({ data: JSON.parse(JSON.stringify(next)) })
        .eq("id", active.id);
      if (error) {
        setActive(active);
        toast.error("Progress could not be saved.");
      } else void queryClient.invalidateQueries({ queryKey: ["private", "roadmaps", user.id] });
    }
  }
  const concepts = active.phases.flatMap((p) => p.concepts);
  const completion = (active.completed.length / Math.max(1, concepts.length)) * 100;
  return (
    <div className="enter-view">
      <section className="pb-7 border-b border-border">
        <div className="flex items-center gap-2 text-violet-soft text-xs">
          <GitBranch size={15} />
          ONE COURSE. EVERY SOURCE.
        </div>
        <h2 className="font-display text-[28px] mt-3">From watching to understanding.</h2>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <div className="relative flex-1">
            <Youtube className="absolute left-4 top-3.5 text-muted-foreground" size={18} />
            <input
              className="field youtube-field h-12 text-sm"
              type="url"
              aria-label="YouTube video or playlist URL"
              placeholder="Paste a YouTube video or playlist URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
          </div>
          <Button
            variant="glow"
            className="h-12 px-6"
            onClick={() => void generate()}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {busy ? "Building roadmap…" : "Generate roadmap"}
            <ArrowRight />
          </Button>
        </div>
        <details className="mt-4">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Learning preferences (optional)
          </summary>
          <textarea
            className="field mt-3"
            placeholder="Your current experience and what you want to build…"
            aria-label="Learning preferences"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </details>
        {stage && (
          <div className="mt-5">
            <div className="flex justify-between text-xs mb-3 gap-3">
              <span className="text-violet-soft break-words min-w-0">{stage}</span>
              {busy && (
                <Button
                  variant="ghost"
                  className="h-5"
                  size="sm"
                  onClick={() => {
                    canceled.current = true;
                    setStage("Stopping after the current request…");
                  }}
                >
                  <X />
                  Stop
                </Button>
              )}
            </div>
            <ProgressLine value={progress} />
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="text-xs leading-relaxed text-warning bg-warning/10 border border-warning/20 rounded-md p-4 mt-4"
          >
            {error}
          </div>
        )}
        {missing.length > 0 && (
          <div className="mt-5 space-y-5">
            {missing.map((v) => (
              <div className="text-xs" key={v.id}>
                <span className="text-muted-foreground">Transcript for {v.title}</span>
                <textarea
                  className="field mt-2 min-h-32"
                  placeholder="[0–120s] What the speaker teaches…"
                  value={manual[v.id] ?? ""}
                  onChange={(e) => setManual((old) => ({ ...old, [v.id]: e.target.value }))}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-foreground/80 hover:text-foreground">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      disabled={transcribing === v.id}
                      onChange={(e) => {
                        const picked = e.target.files?.[0];
                        e.target.value = "";
                        if (picked) void transcribeFromAudio(v, picked);
                      }}
                    />
                    {transcribing === v.id ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {transcribing === v.id
                      ? "Transcribing automatically…"
                      : "Upload the video's audio to transcribe it automatically"}
                  </label>
                  <span>Timings are then estimated from the video length.</span>
                </div>
              </div>
            ))}
            <Button variant="glow" disabled={busy} onClick={() => void continueWithManual()}>
              Synthesize all sources together
              <ArrowRight />
            </Button>
          </div>
        )}
      </section>
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-8 mt-7">
        <aside className="no-print">
          <div className="flex justify-between items-center mb-4">
            <h3 className="eyebrow">YOUR LEARNING LIBRARY</h3>
            <span className="text-[10px] text-muted-foreground">
              {history.data?.length ?? 0} saved
            </span>
          </div>
          <Button
            variant={active.sample ? "secondary" : "ghost"}
            className="w-full h-auto p-4 text-left justify-start whitespace-normal"
            onClick={() => setActive(SAMPLE_ROADMAP)}
          >
            <div>
              <span className="pill text-[8px] mb-2">SAMPLE COURSE</span>
              <p className="text-xs">React & TypeScript mastery</p>
              <p className="text-[10px] text-muted-foreground mt-2">4 phases · 8 days</p>
            </div>
          </Button>
          {history.data?.map((r) => (
            <Button
              variant={active.id === r.id ? "secondary" : "ghost"}
              className="w-full h-auto p-4 text-left justify-start whitespace-normal mt-2"
              key={r.id}
              onClick={() => {
                setActive(r);
                setExpanded(["Foundation"]);
              }}
            >
              <div>
                <p className="text-xs">{r.title}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {r.phases.length} phases · {r.days} days
                </p>
              </div>
            </Button>
          ))}
          {history.error && (
            <p className="text-warning text-xs mt-4">
              Your library could not be loaded. Try again after checking your connection.
            </p>
          )}
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex gap-2 items-center text-violet-soft">
              <Layers3 size={16} />
              <span className="text-xs">Learn with intention.</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-3">
              Knowledge becomes mastery when you put it into practice.
            </p>
          </div>
        </aside>
        <article className="min-w-0">
          <div className="flex justify-between gap-3 items-start">
            <div>
              {active.sample && (
                <span className="pill mb-3">ILLUSTRATIVE SAMPLE · NOT VIDEO ANALYSIS</span>
              )}
              <h2 className="font-display text-2xl">{active.title}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mt-3 max-w-2xl">
                {active.goal}
              </p>
            </div>
            <div className="flex gap-1 no-print">
              <Button
                variant="ghost"
                size="icon"
                title="Export Markdown"
                aria-label="Export Markdown"
                onClick={() =>
                  downloadFile(`${active.title}.md`, roadmapMarkdown(active), "text/markdown")
                }
              >
                <Download />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void exportRoadmapPDF(active).catch(() =>
                    toast.error("PDF export failed. Your roadmap is still available as Markdown."),
                  )
                }
              >
                PDF
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-5 text-[11px] text-muted-foreground">
            <span className="pill">{active.difficulty}</span>
            <span className="flex items-center gap-1">
              <Clock3 size={13} />
              {formatMinutes(active.watchMinutes)} watch time
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays size={13} />
              {active.days} days · 6h/day
            </span>
            <span className="flex items-center gap-1">
              <Layers3 size={13} />
              {concepts.length} concepts
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            <span className="text-foreground">Prerequisites:</span>{" "}
            {active.prerequisites.join(" · ")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <div className="min-w-[180px] flex-1">
              <div className="flex justify-between text-[10px] mb-2">
                <span className="text-muted-foreground">Your progress</span>
                <span>
                  {active.completed.length}/{concepts.length} concepts · {Math.round(completion)}%
                </span>
              </div>
              <ProgressLine value={completion} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!user) {
                  onAuth();
                  return;
                }
                void update({ ...day, careerRoadmap: active.title });
                toast.success("Roadmap added to your daily career block.");
              }}
            >
              <Plus />
              Add to Mizan
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!user) {
                  onAuth();
                  return;
                }
                void update({
                  ...day,
                  careerRoadmap: active.title,
                  blocks: [
                    ...day.blocks.filter((b) => !b.name.startsWith("Learn · ")),
                    { name: `Learn · ${active.title}`, time: "08:00", minutes: 360 },
                  ],
                });
                onCalendar();
              }}
            >
              <CalendarDays />
              Schedule
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-7 border-b border-border pb-3 no-print">
            {[
              { id: "concepts", label: "Learning path" },
              { id: "schedule", label: "Study schedule" },
              { id: "glossary", label: "Glossary & capstone" },
            ].map((t) => (
              <Button
                key={t.id}
                variant={detail === t.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDetail(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          {detail === "concepts" && (
            <div className="mt-6 space-y-4">
              {active.phases.map((phase, i) => {
                const open = expanded.includes(phase.name);
                const done = phase.concepts.filter((c) => active.completed.includes(c.id)).length;
                return (
                  <section className="border-b border-border pb-4" key={phase.name}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto p-0 hover:bg-transparent"
                      onClick={() =>
                        setExpanded((old) =>
                          open ? old.filter((x) => x !== phase.name) : [...old, phase.name],
                        )
                      }
                      aria-expanded={open}
                    >
                      <span className="size-9 flex items-center justify-center rounded-md border border-border bg-accent text-violet-soft font-mono text-xs">
                        0{i + 1}
                      </span>
                      <div className="text-left ml-2">
                        <h3 className="text-sm">{phase.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {phase.concepts.length} concepts · {formatMinutes(phase.minutes)}
                        </p>
                      </div>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {done}/{phase.concepts.length}
                      </span>
                      {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </Button>
                    {open && (
                      <div className="roadmap-line mt-4">
                        {phase.concepts.map((c) => (
                          <div className="concept" key={c.id}>
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="prayer-check shrink-0 mt-0.5"
                                aria-label={`Complete ${c.name}`}
                                checked={active.completed.includes(c.id)}
                                onChange={() => void toggleConcept(c.id)}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-3">
                                  <h4 className="text-sm font-medium">{c.name}</h4>
                                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                    {formatMinutes(c.minutes)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                                  {c.learn}
                                </p>
                                <p className="text-[11px] text-violet-soft leading-relaxed mt-2">
                                  {c.why}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {c.sources.map((s, k) => (
                                    <a
                                      className="pill max-w-full break-words"
                                      key={k}
                                      href={`https://www.youtube.com/watch?v=${s.videoId}&t=${Math.floor(s.start)}s`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Youtube size={11} />
                                      {s.title} · {timestamp(s.start)}–{timestamp(s.end)}
                                      <ArrowUpRight size={11} />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="border-t border-border pt-4 pb-5">
                          <h4 className="text-xs text-violet-soft flex gap-2 items-center">
                            <CodeGlyph />
                            Put it into practice
                          </h4>
                          <ul className="text-xs text-muted-foreground leading-relaxed mt-3 list-disc pl-4 space-y-2">
                            {phase.practice.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                          <p className="text-xs mt-4">
                            <strong className="font-medium">Mini-project:</strong>{" "}
                            <span className="text-muted-foreground">{phase.project}</span>
                          </p>
                          <details className="mt-4">
                            <summary className="text-xs cursor-pointer">
                              Checkpoint questions
                            </summary>
                            <ul className="text-xs text-muted-foreground space-y-2 mt-3 list-decimal pl-4">
                              {phase.questions.map((q) => (
                                <li key={q}>{q}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
          {detail === "schedule" && (
            <div className="mt-6">
              {active.schedule.map((s, i) => (
                <div className="flex gap-5 py-5 border-b border-border" key={i}>
                  <span className="pill self-start shrink-0">{s.day}</span>
                  <div>
                    <h3 className="text-sm">{s.focus}</h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      {s.hours} hours · Watch, practice, then review
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {detail === "glossary" && (
            <div className="mt-6">
              <h3 className="text-sm mb-3">Key terms</h3>
              {active.glossary.map((g) => (
                <div key={g.term} className="py-3 border-b border-border">
                  <h4 className="text-xs font-medium">{g.term}</h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {g.definition}
                  </p>
                </div>
              ))}
              <h3 className="text-sm mt-7">Common mistakes</h3>
              <ul className="list-disc pl-4 space-y-2 text-xs text-muted-foreground mt-3">
                {active.mistakes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <div className="mt-7 border-t border-border pt-6">
                <h3 className="font-display text-xl flex items-center gap-2">
                  <Sparkles className="text-violet-soft" size={19} />
                  The capstone
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-3">
                  {active.capstone}
                </p>
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
function CodeGlyph() {
  return <BookOpen size={13} />;
}
