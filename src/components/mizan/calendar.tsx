import { CalendarDays, Download, ExternalLink, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calendarICS, downloadFile, type Day } from "@/lib/mizan";

export function Calendar({
  day,
  date,
  update,
}: {
  day: Day;
  date: string;
  update: (d: Day) => Promise<void>;
}) {
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
          <div className="pt-1">
            <h3 className="text-sm">Add to your calendar</h3>
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
