import { DonateBox } from "@/components/mizan/donate-box";
import { createPortal } from "react-dom";
import { lazyWithReload } from "@/lib/lazy-reload";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import {
  CalendarDays,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  Flame,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogIn,
  Moon,
  Settings2,
  ShieldCheck,
  UserRound,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSampleDay } from "@/lib/mizan.functions";
import { useMizanJournal } from "@/hooks/use-mizan-journal";
import { AuthDialog } from "@/components/mizan/auth";
import { RahamLogo } from "@/components/mizan/shared";
import { Daily } from "@/components/mizan/daily";
import { Plan } from "@/components/mizan/plan";
import { IstighfarCard } from "@/components/mizan/istighfar-card";

const JournalGarden = lazyWithReload(() => import("@/components/garden/journal-garden").then((m) => ({ default: m.JournalGarden })));
const Analytics = lazyWithReload(() => import("@/components/mizan/analytics").then((m) => ({ default: m.Analytics })));
const Quran = lazyWithReload(() => import("@/components/mizan/quran").then((m) => ({ default: m.Quran })));
const Fallback = () => <div className="py-16 flex justify-center text-muted-foreground"><LoaderCircle className="animate-spin" /></div>;
import { downloadFile } from "@/lib/mizan";

const sampleOptions = queryOptions({
  queryKey: ["mizan-sample"],
  queryFn: () => getSampleDay(),
  staleTime: Infinity,
});
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RAHAM — Daily accountability & habit tracking" },
      {
        name: "description",
        content:
          "Balance faith, discipline, and career mastery. Track daily prayers, focused work, personal targets, and progress in one private workspace.",
      },
      { property: "og:title", content: "RAHAM — Faith. Discipline. Mastery." },
      {
        property: "og:description",
        content:
          "A private daily accountability system for prayer, habits, plans, and deliberate growth.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(sampleOptions),
  component: Index,
});
const tabs = [
  { id: "daily", name: "Today", icon: LayoutDashboard },
  { id: "plan", name: "My plan", icon: ListChecks },
  { id: "analytics", name: "Progress", icon: Flame },
  { id: "quran", name: "Quran", icon: BookOpen },
] as const;
type Tab = (typeof tabs)[number]["id"];
function Index() {
  const { data: sample } = useSuspenseQuery(sampleOptions);
  const journal = useMizanJournal(sample);
  const [tab, setTab] = useState<Tab>("daily");
  const [authOpen, setAuthOpen] = useState(false);
  // On phones the 3D garden sits between "Nafs & purity" and "The balance".
  const [mobileGarden, setMobileGarden] = useState<HTMLElement | null>(null);
  const [hijri, setHijri] = useState("");
  const currentTab = tabs.find((t) => t.id === tab);
  const { user, date, saving, loading } = journal;
  useEffect(() => {
    if (loading) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const pick = () => setMobileGarden(mq.matches ? document.getElementById("mobile-garden") : null);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, [loading]);
  useEffect(() => {
    try {
      setHijri(
        new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(`${date}T12:00:00`)),
      );
    } catch {
      setHijri("");
    }
  }, [date]);
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setAuthOpen(true);
  }, []);
  const gregorian = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const gregorianShort = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  function changeTab(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  return (
    <div className="mizan-shell">
      <aside className="mizan-sidebar">
        <div className="sidebar-brand">
          <div className="flex items-center gap-3">
            <RahamLogo />
            <span className="brand-word">
              RAHAM
              <span className="block text-[9px] font-sans font-normal text-muted-foreground mt-1">
                FAITH · DISCIPLINE · MASTERY
              </span>
            </span>
          </div>
          <div className="mt-10 mb-3 text-[9px] text-muted-foreground">YOUR DAILY COMPASS</div>
        </div>
        <nav className="sidebar-nav grid gap-2" aria-label="Main navigation">
          {tabs.map((t) => (
            <Button
              variant="nav"
              data-active={tab === t.id}
              aria-current={tab === t.id ? "page" : undefined}
              key={t.id}
              aria-label={t.name}
              title={t.name}
              onClick={() => changeTab(t.id)}
            >
              <t.icon size={17} />
              <span className="sidebar-label">{t.name}</span>
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom mt-auto">
          <div className="border-t border-border pt-6 px-2 pb-6">
            <Moon className="text-violet-soft mb-3" size={20} />
            <p className="font-display text-sm leading-relaxed">
              Small deeds.
              <br />
              Sincere intention.
              <br />
              Every single day.
            </p>
            <p className="text-[10px] leading-relaxed text-muted-foreground mt-3">
              The most beloved deeds to Allah are those done consistently.
            </p>
            <p className="text-[8px] text-muted-foreground mt-2">SAHIH AL-BUKHARI · 6464</p>
          </div>
          <Button variant="nav" aria-label={user ? "My account" : "Sign in to RAHAM"} title={user ? "My account" : "Sign in to RAHAM"} onClick={() => setAuthOpen(true)}>
            <UserRound size={16} />
            <span className="truncate sidebar-label">{user ? "My account" : "Sign in to RAHAM"}</span>
            <ChevronRight size={13} className="ml-auto sidebar-label" />
          </Button>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-4 px-3">
            <ShieldCheck size={12} />
            Private by intention. Always.
          </div>
        </div>
      </aside>
      <main className="mizan-main">
        <header className="mizan-topbar">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground desktop-label">My workspace</span>
            <ChevronRight size={12} className="text-muted-foreground desktop-label" />
            <span>{currentTab?.name}</span>
            <label className="md:hidden flex flex-col leading-tight ml-2 pl-2 border-l border-border cursor-pointer">
              <span className="text-[11px] flex items-center gap-1.5 whitespace-nowrap">
                {gregorianShort}
                <span className="journal-date">
                  <CalendarDays size={12} className="text-violet-soft" />
                  <input aria-label="Journal date (mobile)" type="date" value={date} onChange={(e) => e.target.value && journal.setDate(e.target.value)} />
                </span>
              </span>
              <span className="text-[9px] text-muted-foreground">{hijri}</span>
            </label>
          </div>
          <div className="flex gap-3 items-center">
            <span className="pill muted-pill desktop-label">
              {user ? (
                <>
                  <Cloud size={10} />
                  {saving ? "Saving…" : journal.saveError ? "Unsaved changes" : "Private workspace"}
                </>
              ) : (
                "SAMPLE WORKSPACE"
              )}
            </span>
            <Button
              variant="ghost"
              size="icon"
              title="Export journal"
              aria-label="Export journal"
              className="size-8"
              onClick={() =>
                downloadFile(
                  `mizan-${date}.json`,
                  JSON.stringify({ history: journal.history }, null, 2),
                  "application/json",
                )
              }
            >
              <Download size={15} />
            </Button>
            <DonateBox />
            <Button
              variant="outline"
              className="size-8 rounded-full p-0"
              title={user ? "My account" : "Sign in"}
              aria-label={user ? "My account" : "Sign in"}
              onClick={() => setAuthOpen(true)}
            >
              <UserRound size={14} />
            </Button>
          </div>
        </header>
        <div className="mizan-content">
          <div className="flex flex-wrap gap-5 items-end justify-between mb-6">
            <div>
              <div className="text-[10px] text-violet-soft flex items-center gap-2 mb-2">
                <span className="size-1.5 rounded-full bg-violet-soft" />
                BISMILLAH. ONE STEP AT A TIME.
              </div>
              <h1 className="font-display text-[30px] sm:text-[32px] font-bold tab-enter" key={tab}>
                {tab === "daily"
                  ? "Today, one step at a time."
                  : tab === "plan"
                    ? "Plan your days ahead."
                    : tab === "analytics"
                      ? "Your progress, honestly."
                      : tab === "quran"
                        ? "Read the Quran, one juz at a time."
                        : "Your sacred calendar."}
              </h1>
              <p className="text-xs text-muted-foreground mt-2 tab-enter" key={`${tab}-sub`}>
                {tab === "daily"
                  ? "Assalamu alaikum. Set what matters today, then finish it."
                  : tab === "plan"
                    ? "A target for one day, or a rhythm for the months ahead."
                    : tab === "analytics"
                      ? "A calm look at the days you showed up."
                      : tab === "quran"
                        ? "Choose any of the 30 parts and mark it when you finish."
                        : "Faith first. Focus protected. Intentions honored."}
              </p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[11px] text-muted-foreground">{hijri}</p>
              <label className="flex gap-2 items-center justify-end mt-2 text-[11px] cursor-pointer">
                <span>{gregorian}</span>
                <span className="journal-date">
                  <CalendarDays size={14} className="text-violet-soft" />
                  <input
                    aria-label="Journal date"
                    type="date"
                    value={date}
                    onChange={(e) => e.target.value && journal.setDate(e.target.value)}
                  />
                </span>
              </label>
            </div>
          </div>
          {!user && journal.ready && (
            <div className="flex items-center justify-between gap-3 border-l-2 border-primary pl-3 mb-6">
              <p className="text-[11px] text-muted-foreground">
                You’re exploring sample data. Your personal journal starts fresh when you sign in.
              </p>
              <Button
                variant="link"
                className="h-6 text-[11px] p-0 shrink-0 text-foreground underline"
                onClick={() => setAuthOpen(true)}
              >
                Sign in <ChevronRight size={12} />
              </Button>
            </div>
          )}
          {journal.saveError && (
            <div
              role="alert"
              className="text-xs text-warning flex justify-between items-center mb-5"
            >
              <span>Your latest changes have not been saved.</span>
              <Button variant="outline" size="sm" onClick={() => void journal.update(journal.day)}>
                Retry saving
              </Button>
            </div>
          )}
          {journal.error && (
            <div role="alert" className="text-warning text-xs mb-5">
              Your private journal could not be loaded. Check your connection before making changes.
            </div>
          )}
          {loading ? (
            <div className="py-20 flex flex-col items-center text-muted-foreground gap-4">
              <LoaderCircle className="animate-spin text-violet-soft" />
              <span className="text-xs">Opening your private journal…</span>
            </div>
          ) : (
            <>
              <div hidden={tab !== "daily"} className="today-stack">
                {(() => {
                  const garden = (
                    <Suspense fallback={<div className="h-[420px] rounded-xl bg-card/40 mb-6" />}>
                      <JournalGarden history={journal.history} date={date} />
                    </Suspense>
                  );
                  return mobileGarden ? createPortal(garden, mobileGarden) : garden;
                })()}
                <div id="desktop-prayer" className="hidden md:block" />
                <IstighfarCard day={journal.day} date={date} update={journal.update} repeat={journal.repeat} />
                <Daily
                  journal={journal}
                  onAuth={() => setAuthOpen(true)}
                  onAnalytics={() => changeTab("analytics")}
                />
              </div>
              <div hidden={tab !== "plan"}>
                <Plan key={date} date={date} day={journal.day} update={journal.update} repeat={journal.repeat} sample={!user} />
              </div>
              <div id="mobile-deepwork" hidden={tab !== "analytics"} className="md:hidden mb-6" />
              <Suspense fallback={<Fallback />}>
                {tab === "analytics" && <Analytics history={journal.history} date={date} sample={!user} />}
                {tab === "quran" && <Quran />}
              </Suspense>
            </>
          )}
          <footer className="text-[9px] text-muted-foreground flex justify-between mt-8 pt-5 border-t border-border">
            <span>RAHAM · Intention into action.</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={11} />
              {user ? "Your journal, only yours." : "Sample data · not your personal record"}
            </span>
          </footer>
        </div>
      </main>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
