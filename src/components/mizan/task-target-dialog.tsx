import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { taskIsDone, type Task } from "@/lib/mizan";

export function TaskTargetDialog({
  task,
  onOpenChange,
  onSave,
}: {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("09:00");
  const [countTo, setCountTo] = useState("");
  const [mark, setMark] = useState<"open" | "done" | "missed">("open");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setFrom(task.from);
    setTo(task.to);
    setCountTo(task.countTo ? String(task.countTo) : "");
    setMark(taskIsDone(task) ? "done" : task.missed ? "missed" : "open");
  }, [task]);

  if (!task) return null;

  async function save() {
    const label = name.trim();
    if (!label) {
      toast.error("Write what you intend to do first.");
      return;
    }
    if (to <= from) {
      toast.error("The end time should come after the start time.");
      return;
    }
    const fixedCount = countTo.trim() ? Number(countTo) : 0;
    if (!Number.isInteger(fixedCount) || fixedCount < 0) {
      toast.error("Use a whole number of 1 or more, or leave the fixed count empty.");
      return;
    }
    const openWouldBeDone = taskIsDone({ ...task!, countTo: fixedCount });
    const count = mark === "done" ? fixedCount : mark === "missed" || openWouldBeDone ? 0 : task!.count;
    setSaving(true);
    try {
      await onSave({ ...task!, name: label, from, to, countTo: fixedCount, done: mark === "done", missed: mark === "missed", count });
      onOpenChange(false);
      toast.success(fixedCount ? `Daily target fixed at ${fixedCount}.` : "Target updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your target could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set your target</DialogTitle>
          <DialogDescription>
            Fix the time and daily count here. In Today, type the amount you completed—there is no plus counter.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label className="plan-time">
            Target name
            <input className="field" aria-label="Edit target name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="plan-time">
              From
              <input className="field" aria-label="Edit start time" type="time" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="plan-time">
              To
              <input className="field" aria-label="Edit end time" type="time" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>
          <label className="plan-time">
            Fixed daily count (optional)
            <input
              className="field"
              aria-label="Fixed daily count"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="For Istighfar: 1000"
              value={countTo}
              onChange={(event) => setCountTo(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <p className="text-xs text-muted-foreground -mt-2">Leave empty for a simple done tick.</p>
          <div>
            <p className="plan-time mb-2">Today’s mark</p>
            <div className="target-mark-choices" role="group" aria-label="Target mark">
              <Button type="button" variant={mark === "done" ? "secondary" : "outline"} aria-pressed={mark === "done"} onClick={() => setMark("done")}>Done <span className="text-success">+1</span></Button>
              <Button type="button" variant={mark === "missed" ? "secondary" : "outline"} aria-pressed={mark === "missed"} onClick={() => setMark("missed")}>Missed <span className="text-destructive">−1</span></Button>
              <Button type="button" variant={mark === "open" ? "secondary" : "outline"} aria-pressed={mark === "open"} onClick={() => setMark("open")}>Open <span className="text-muted-foreground">0</span></Button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="glow" disabled={saving}>{saving ? "Saving…" : "Save target"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
