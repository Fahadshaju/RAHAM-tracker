import { useEffect, useState } from "react";
import { BookOpen, Check, Cloud, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PdfReader } from "./pdf-reader";

const files = import.meta.glob<{ url: string }>("@/assets/quran/juz-*.pdf.asset.json", {
  eager: true,
  import: "default",
});
const starts = import.meta.glob<{ url: string }>("@/assets/quran/start-*.jpg.asset.json", {
  eager: true,
  import: "default",
});
const startUrls = Object.keys(starts).sort().map((k) => starts[k]!.url);
const parts = Object.keys(files)
  .sort()
  .map((key, i) => ({ number: i + 1, url: files[key]!.url, start: startUrls[i] ?? "" }));
const STORE = "raham-quran-read";

export function Quran() {
  const [active, setActive] = useState(1);
  const [read, setRead] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [previews, setPreviews] = useState(false);
  useEffect(() => {
    let local: { read?: number[]; last?: number } = {};
    try {
      local = JSON.parse(localStorage.getItem(STORE) ?? "{}");
      if (Array.isArray(local.read)) setRead(local.read);
      if (typeof local.last === "number") setActive(local.last);
    } catch {
      /* ignore */
    }
    async function pull(uid: string | null) {
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase.from("quran_progress").select("read_juz,last_juz").eq("user_id", uid).maybeSingle();
      if (data) {
        // Merge so ticks made on this device before signing in are kept.
        const merged = [...new Set([...(data.read_juz ?? []), ...(local.read ?? [])])].sort((a, b) => a - b);
        setRead(merged);
        setActive(data.last_juz);
        localStorage.setItem(STORE, JSON.stringify({ read: merged, last: data.last_juz }));
        if (merged.length !== (data.read_juz ?? []).length) void push(uid, merged, data.last_juz);
      } else if (local.read?.length) void push(uid, local.read, local.last ?? 1);
    }
    void supabase.auth.getSession().then(({ data }) => pull(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null;
      setUserId((old) => (old === uid ? old : (void pull(uid), uid)));
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  async function push(uid: string, nextRead: number[], last: number) {
    const { error } = await supabase
      .from("quran_progress")
      .upsert({ user_id: uid, read_juz: nextRead, last_juz: last, updated_at: new Date().toISOString() });
    if (error) console.error("Quran progress sync failed", error.message);
  }
  function save(nextRead: number[], last: number) {
    localStorage.setItem(STORE, JSON.stringify({ read: nextRead, last }));
    if (userId) void push(userId, nextRead, last);
  }
  function open(n: number) {
    setActive(n);
    setPreviews(false);
    save(read, n);
    window.__lovableEvents?.track?.("project.quran_juz_opened", { juz: n });
  }
  function toggleRead(n: number) {
    const done = !read.includes(n);
    const next = done ? [...read, n] : read.filter((x) => x !== n);
    setRead(next);
    save(next, active);
    if (done) window.__lovableEvents?.track?.("project.quran_juz_marked_read", { juz: n });
  }
  const part = parts.find((p) => p.number === active) ?? parts[0]!;
  return (
    <div className="grid gap-6">
      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-violet-soft" />
            <span className="text-sm font-semibold whitespace-nowrap">30 Juz</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
              {userId && <Cloud size={12} aria-label="Synced to your account" />}
              {read.length} / 30 completed
            </span>
            <Button variant="outline" size="sm" onClick={() => setPreviews((v) => !v)} aria-pressed={previews}>
              <Images size={13} />
              {previews ? "Hide start pages" : "Start pages"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {parts.map((p) => (
            <button
              key={p.number}
              type="button"
              onClick={() => open(p.number)}
              aria-pressed={active === p.number}
              className={`relative h-11 rounded-md border text-sm transition-colors ${
                active === p.number
                  ? "border-primary bg-primary/20 text-foreground"
                  : "border-border hover:border-primary/60 text-muted-foreground"
              }`}
            >
              {p.number}
              {read.includes(p.number) && (
                <Check size={11} className="absolute top-1 right-1 text-gold" />
              )}
            </button>
          ))}
        </div>
      </div>
      {previews && (
        <div className="panel">
          <p className="text-[12px] text-muted-foreground mb-3">First page of each juz — tap one to open it.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {parts.map((p) => (
              <button key={p.number} type="button" onClick={() => open(p.number)} className="text-left rounded-md border border-border overflow-hidden hover:border-primary/60 transition-colors">
                <img src={p.start} alt={`First page of Juz ${p.number}`} loading="lazy" className="w-full aspect-[3/4] object-cover object-top bg-white" />
                <span className="block px-2 py-1.5 text-[13px]">Juz {p.number}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="panel">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:flex sm:justify-between items-center gap-3 mb-4">
          <h2 className="font-display text-xl truncate">Juz {part.number}</h2>
          <div className="flex gap-2 shrink-0">
            <Button
              variant={read.includes(part.number) ? "glow" : "outline"}
              size="sm"
              onClick={() => toggleRead(part.number)}
            >
              <Check size={13} />
              {read.includes(part.number) ? "Completed" : "Mark as read"}
            </Button>
          </div>
        </div>
        <PdfReader url={part.url} title={`Juz ${part.number}`} />
      </div>
    </div>
  );
}
