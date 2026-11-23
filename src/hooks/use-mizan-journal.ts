import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useMizanAuth } from "@/components/mizan/auth";
import { dateKey, daySchema, makeDay, type Day } from "@/lib/mizan";
import { saveDay } from "@/lib/mizan.functions";
import { toast } from "sonner";

export function useMizanJournal(sample: Day) {
  const { user, ready } = useMizanAuth();
  const [date, setDate] = useState("2026-11-23");
  const [day, setDay] = useState(sample);
  const [demoHistory, setDemoHistory] = useState<Record<string, Day>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const save = useServerFn(saveDay);
  const queryClient = useQueryClient();
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const pending = useRef(0);
  const workspace = useRef("");
  useEffect(() => {
    setDate(dateKey());
  }, []);
  const historyQuery = useQuery({
    queryKey: ["private", "journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mizan_days")
        .select("day,data")
        .order("day", { ascending: false })
        .limit(400);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((row) => [row.day, daySchema.parse(row.data)]),
      ) as Record<string, Day>;
    },
  });
  useEffect(() => {
    const key = `${user?.id ?? "sample"}:${date}`;
    if (workspace.current !== key) {
      workspace.current = key;
      setSaveError(false);
      setDay(user ? (historyQuery.data?.[date] ?? makeDay()) : (demoHistory[date] ?? sample));
    } else if (user && !pending.current && historyQuery.data) {
      setDay(historyQuery.data[date] ?? makeDay());
    }
  }, [user?.id, date, historyQuery.data, sample]);
  // Serialize snapshots: an older, slower save must never overwrite a newer edit.
  async function update(next: Day) {
    setDay(next);
    setSaveError(false);
    if (!user) {
      setDemoHistory((prev) => ({ ...prev, [date]: next }));
      return;
    }
    const ownRevision = ++revision.current;
    const ownWorkspace = `${user.id}:${date}`;
    const userId = user.id;
    const selectedDate = date;
    pending.current++;
    setSaving(true);
    const task = queue.current.then(async () => {
      try {
        await save({ data: { day: selectedDate, data: next } });
        if (ownRevision === revision.current) {
          queryClient.setQueryData<Record<string, Day>>(["private", "journal", userId], (old) => ({
            ...old,
            [selectedDate]: next,
          }));
        }
      } catch (e) {
        if (workspace.current === ownWorkspace) {
          setSaveError(true);
          toast.error(
            e instanceof Error
              ? e.message
              : "Could not save. Your changes are still visible; retry saving.",
          );
        }
      } finally {
        pending.current--;
        if (!pending.current) setSaving(false);
      }
    });
    queue.current = task;
    await task;
  }
  const history = user ? { ...historyQuery.data, [date]: day } : { ...demoHistory, [date]: day };
  return {
    day,
    date,
    setDate,
    update,
    history,
    saving,
    saveError,
    user,
    ready,
    loading: !!user && historyQuery.isPending,
    error: historyQuery.error,
  };
}
