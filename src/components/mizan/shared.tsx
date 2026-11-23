import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import rahamLogo from "@/assets/raham-logo.png";

export function RahamLogo() {
  return <img className="brand-mark" src={rahamLogo} alt="" aria-hidden="true" />;
}
export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <h2 className="panel-title">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Ring({
  value,
  max = 10,
  children,
  dhikr = false,
}: {
  value: number;
  max?: number;
  children: ReactNode;
  dhikr?: boolean;
}) {
  const circumference = 2 * Math.PI * 62;
  return (
    <div className={dhikr ? "dhikr-ring" : "score-ring"}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="ring-track" cx="70" cy="70" r="62" />
        <circle
          className="ring-value"
          cx="70"
          cy="70"
          r="62"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(1, value / max))}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
export function ProgressLine({ value }: { value: number }) {
  return (
    <div className="mini-progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
const reminders = [
  {
    text: "Indeed, Allah will not change the condition of a people until they change what is in themselves.",
    source: "QUR’AN · 13:11",
  },
  {
    text: "And that there is not for man except that for which he strives.",
    source: "QUR’AN · 53:39",
  },
  { text: "So, surely with hardship comes ease.", source: "QUR’AN · 94:5" },
  { text: "Do not lose hope in Allah’s mercy.", source: "QUR’AN · 39:53" },
];
export function Reminder({ date }: { date: string }) {
  const index = Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 86400000) % reminders.length;
  const reminder = reminders[index] ?? reminders[0];
  return (
    <div className="reminder">
      <div className="reminder-icon">
        <Sparkles size={19} />
      </div>
      <div className="relative z-10">
        <p className="text-[13px] leading-relaxed">“{reminder?.text}”</p>
        <p className="text-[9px] text-violet-soft mt-2">{reminder?.source}</p>
      </div>
    </div>
  );
}
