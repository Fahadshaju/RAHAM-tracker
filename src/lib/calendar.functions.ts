import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { daySchema } from "./mizan";
export const startCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorizeCalendar } = await import("./calendar-gateway.server");
    const request = getRequest();
    const url = new URL(request.url);
    const host = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/api/public/oauth/google/return",
      host ? `https://${host}` : url.origin,
    ).toString();
    return { authorizationUrl: await authorizeCalendar(context.userId, returnUrl) };
  });
export const completeCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { exchangeCalendar } = await import("./calendar-gateway.server");
    await exchangeCalendar(context.userId, data.code);
    return { ok: true };
  });
export const calendarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { calendarKey, calendarRequest } = await import("./calendar-gateway.server");
    const key = await calendarKey(context.userId);
    if (!key) return { connected: false, reconnect: false };
    const response = await calendarRequest(
      key,
      "calendars/primary/events?maxResults=1&fields=kind",
    );
    if (response.status === 401) {
      const data = (await response
        .clone()
        .json()
        .catch(() => null)) as { type?: string } | null;
      if (data?.type?.startsWith("credential_")) return { connected: false, reconnect: true };
    }
    if (!response.ok) {
      const body = await response.text();
      console.error(`Calendar ${response.status}: ${body}`);
      throw new Error(`Google Calendar access failed (${response.status}): ${body}`);
    }
    return { connected: true, reconnect: false };
  });
export const syncCalendarBlocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timezone: z.string(),
        blocks: daySchema.shape.blocks,
        repeat: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { calendarKey, calendarRequest } = await import("./calendar-gateway.server");
    const key = await calendarKey(context.userId);
    if (!key) throw new Error("Connect your Google Calendar first.");
    let synced = 0;
    for (const b of data.blocks) {
      const raw = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${context.userId}:${b.name}`),
      );
      const id = Array.from(new Uint8Array(raw), (x) => x.toString(16).padStart(2, "0")).join("");
      const [hour, minute] = b.time.split(":").map(Number);
      const end = new Date(`${data.date}T00:00:00Z`);
      end.setUTCMinutes((hour ?? 0) * 60 + (minute ?? 0) + b.minutes);
      const endLocal = `${end.toISOString().slice(0, 10)}T${end.toISOString().slice(11, 19)}`;
      const event = {
        summary: `RAHAM · ${b.name}`,
        description: "A protected block for intention and deliberate action.",
        start: { dateTime: `${data.date}T${b.time}:00`, timeZone: data.timezone },
        end: { dateTime: endLocal, timeZone: data.timezone },
        ...(data.repeat ? { recurrence: ["RRULE:FREQ=DAILY"] } : {}),
      };
      const existing = await calendarRequest(key, `calendars/primary/events/${id}`);
      if (!existing.ok && existing.status !== 404) {
        const body = await existing.text();
        throw new Error(`Calendar lookup failed (${existing.status}): ${body}`);
      }
      const response = await calendarRequest(
        key,
        existing.ok ? `calendars/primary/events/${id}` : "calendars/primary/events",
        {
          method: existing.ok ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existing.ok ? event : { id, ...event }),
        },
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(`Calendar ${response.status}: ${body}`);
        throw new Error(
          `${synced} blocks synced before Google Calendar stopped (${response.status}): ${body}`,
        );
      }
      synced++;
    }
    return { synced };
  });
export const removeCalendarConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { calendarKey, disconnectCalendar } = await import("./calendar-gateway.server");
    const key = await calendarKey(context.userId);
    if (key) await disconnectCalendar(context.userId, key);
    return { ok: true };
  });
