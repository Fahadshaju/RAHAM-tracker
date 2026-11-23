import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Moon,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "./shared";
import { useMizanAuth } from "./auth";
import { calendarICS, downloadFile, type Day } from "@/lib/mizan";
import {
  calendarStatus,
  startCalendarConnect,
  completeCalendarConnect,
  syncCalendarBlocks,
  removeCalendarConnection,
} from "@/lib/calendar.functions";
import { toast } from "sonner";

export function Calendar({
  day,
  date,
  update,
  onAuth,
}: {
  day: Day;
  date: string;
  update: (d: Day) => Promise<void>;
  onAuth: () => void;
}) {
  const { user } = useMizanAuth();
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(0);
  const statusFn = useServerFn(calendarStatus);
  const start = useServerFn(startCalendarConnect);
  const complete = useServerFn(completeCalendarConnect);
  const sync = useServerFn(syncCalendarBlocks);
  const disconnect = useServerFn(removeCalendarConnection);
  const status = useQuery({
    queryKey: ["private", "calendar", user?.id],
    enabled: !!user,
    queryFn: () => statusFn(),
  });
  async function connect() {
    if (!user) {
      onAuth();
      return;
    }
    const popup = window.open("", "mizan-calendar", "width=600,height=720");
    if (!popup) {
      toast.error("Allow popups to connect Google Calendar.");
      return;
    }
    setBusy(true);
    try {
      const { authorizationUrl } = await start();
      const codePromise = new Promise<string | null>((resolve, reject) => {
        let poll: number;
        const cleanup = () => {
          window.removeEventListener("message", onMessage);
          window.clearInterval(poll);
        };
        const onMessage = (event: MessageEvent) => {
          const data = event.data as { type?: string; connectorId?: string; code?: string };
          if (
            event.origin !== window.location.origin ||
            event.source !== popup ||
            data.connectorId !== "google_calendar" ||
            !["appUserConnectorOAuthComplete", "appUserConnectorOAuthFailed"].includes(
              data.type ?? "",
            )
          )
            return;
          cleanup();
          if (data.type === "appUserConnectorOAuthComplete")
            resolve(typeof data.code === "string" ? data.code : null);
          else reject(new Error("Calendar consent was not completed."));
        };
        window.addEventListener("message", onMessage);
        poll = window.setInterval(() => {
          if (popup.closed) {
            cleanup();
            reject(new Error("Calendar window closed before confirmation."));
          }
        }, 500);
      });
      popup.location.href = authorizationUrl;
      const code = await codePromise;
      if (code) await complete({ data: { code } });
      else throw new Error("Offline access must be enabled for calendar sync.");
      await status.refetch();
      toast.success(
        status.data?.reconnect
          ? "Reconnected to Google Calendar."
          : "Connected to Google Calendar.",
      );
    } catch (e) {
      popup.close();
      toast.error(e instanceof Error ? e.message : "Calendar connection failed.");
    } finally {
      setBusy(false);
    }
  }
  async function syncBlocks() {
    if (!user) {
      onAuth();
      return;
    }
    setSyncing(true);
    try {
      const { synced } = await sync({
        data: {
          date,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          blocks: day.blocks,
          repeat: true,
        },
      });
      setSynced(synced);
      toast.success(`${synced} sacred blocks synced to Google Calendar.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div className="enter-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h2 className="font-display text-2xl">Protect what matters.</h2>
          <p className="text-xs text-muted-foreground mt-3">
            Your time is an amanah. Give your intentions a place in your day.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            downloadFile("mizan-sacred-blocks.ics", calendarICS(day.blocks, date), "text/calendar")
          }
        >
          <Download />
          Export calendar
        </Button>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)] gap-6 mt-7">
        <section>
          <div className="flex justify-between mb-5">
            <h3 className="text-sm flex gap-2 items-center">
              <CalendarDays size={17} className="text-violet-soft" />
              Sacred blocks
            </h3>
            <span className="pill">RECURRING DAILY</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_95px_80px] gap-3 text-[10px] text-muted-foreground uppercase border-b border-border pb-3">
            <span>Intention</span>
            <span>Starts</span>
            <span>Minutes</span>
          </div>
          {day.blocks.map((b, i) => (
            <div
              key={b.name}
              className="grid grid-cols-[minmax(0,1fr)_95px_80px] gap-3 items-center py-4 border-b border-border"
            >
              <div className="flex gap-3 items-center min-w-0">
                <span className="flex size-8 items-center justify-center rounded-md bg-accent text-violet-soft shrink-0">
                  {i < 6 ? <Moon size={14} /> : <CalendarDays size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs break-words">{b.name}</p>
                  {i === 0 && (
                    <p className="text-[9px] text-muted-foreground mt-1">Voluntary night prayer</p>
                  )}
                </div>
              </div>
              <input
                aria-label={`${b.name} block start`}
                className="field text-[11px] px-2 py-2"
                type="time"
                value={b.time}
                onChange={(e) =>
                  void update({
                    ...day,
                    blocks: day.blocks.map((x, j) =>
                      j === i ? { ...x, time: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                aria-label={`${b.name} block minutes`}
                className="field text-[11px] px-2 py-2 font-mono"
                type="number"
                min={1}
                max={1440}
                value={b.minutes}
                onChange={(e) => {
                  const minutes = Number(e.target.value);
                  if (minutes > 0 && minutes <= 1440)
                    void update({
                      ...day,
                      blocks: day.blocks.map((x, j) => (j === i ? { ...x, minutes } : x)),
                    });
                }}
              />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-4">
            Times use your browser’s local timezone. Prayer blocks are editable; adjust them as
            prayer times change.
          </p>
        </section>
        <div className="space-y-5">
          <Panel title="Google Calendar" icon={<CalendarDays />}>
            <div className="p-6">
              <div className="size-12 flex items-center justify-center border border-border rounded-lg bg-secondary">
                <CalendarDays className="text-violet-soft" size={25} />
              </div>
              <h3 className="font-display text-xl mt-5">
                {status.data?.connected
                  ? "Your calendar is connected."
                  : "Make room for your intentions."}
              </h3>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                {status.data?.reconnect
                  ? "Your Google Calendar access needs to be renewed."
                  : "Connect your own calendar to create and update your recurring sacred blocks."}
              </p>
              {status.error && (
                <p role="alert" className="text-xs text-warning mt-3">
                  {status.error instanceof Error
                    ? status.error.message
                    : "Calendar access could not be checked."}
                </p>
              )}
              <div className="grid gap-3 mt-6">
                {status.data?.connected ? (
                  <>
                    <Button variant="glow" disabled={syncing} onClick={() => void syncBlocks()}>
                      {syncing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                      {syncing ? "Syncing blocks…" : "Sync sacred blocks"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await disconnect();
                          await status.refetch();
                          setSynced(0);
                          toast.success(
                            "Google Calendar disconnected. Existing events are unchanged.",
                          );
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Disconnect failed.");
                        }
                      }}
                    >
                      Disconnect calendar
                    </Button>
                  </>
                ) : (
                  <Button variant="glow" disabled={busy} onClick={() => void connect()}>
                    {busy ? <LoaderCircle className="animate-spin" /> : <Link2 />}
                    {busy
                      ? "Connecting…"
                      : status.data?.reconnect
                        ? "Reconnect Google Calendar"
                        : "Connect Google Calendar"}
                  </Button>
                )}
                {synced > 0 && (
                  <p className="text-success text-xs flex items-center gap-2">
                    <Check size={14} />
                    {synced} blocks synced
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-2 mt-5">
                <LockKeyhole size={12} />
                Your calendar access stays private.
              </p>
            </div>
          </Panel>
          <div className="border-t border-border pt-5">
            <h3 className="text-sm">Prefer another calendar?</h3>
            <p className="text-xs leading-relaxed text-muted-foreground mt-3">
              Export your sacred blocks and import them into Apple Calendar, Outlook, or any
              calendar that supports .ics.
            </p>
            <Button
              variant="link"
              className="p-0 text-xs mt-3"
              onClick={() =>
                downloadFile(
                  "mizan-sacred-blocks.ics",
                  calendarICS(day.blocks, date),
                  "text/calendar",
                )
              }
            >
              <Download />
              Download .ics
              <ExternalLink size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
