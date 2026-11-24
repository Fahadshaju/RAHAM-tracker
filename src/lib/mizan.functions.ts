import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addRepeatingTask, daySchema, makeDay, repeatDates, repeatPlanSchema } from "./mizan";

export const getSampleDay = createServerFn({ method: "GET" }).handler(async () => {
  const base = makeDay(true);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("mizan_samples").select("data").eq("id", "daily").maybeSingle();
    return daySchema.parse({ ...base, ...((data?.data as object) ?? {}) });
  } catch {
    return base;
  }
});
export const saveDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const schema = daySchema;
    const value = input as { day?: unknown; data?: unknown };
    if (typeof value.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.day))
      throw new Error("Invalid date");
    return { day: value.day, data: schema.parse(value.data) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("mizan_days")
      .upsert(
        {
          user_id: context.userId,
          day: data.day,
          data: JSON.parse(JSON.stringify(data.data)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveRepeatingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => repeatPlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const dates = repeatDates(data);
    const lastDate = dates.at(-1);
    if (!lastDate) throw new Error("No dates match this plan.");
    const { data: existing, error: readError } = await context.supabase.from("mizan_days")
      .select("day,data").eq("user_id", context.userId)
      .gte("day", `${data.startMonth}-01`).lte("day", lastDate).limit(4000);
    if (readError) throw new Error("Your plan could not be loaded. Try again.");
    const history = Object.fromEntries((existing ?? []).map((row) => [row.day, daySchema.parse(row.data)]));
    const updated = Object.fromEntries(dates.map((date) => [date, addRepeatingTask(history[date] ?? makeDay(), data.task, date)]));
    const rows = Object.entries(updated).map(([day, value]) => ({ user_id: context.userId, day, data: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() }));
    const { error } = await context.supabase.from("mizan_days").upsert(rows, { onConflict: "user_id,day" });
    if (error) throw new Error("Your repeating plan could not be saved. Try again.");
    return updated;
  });
