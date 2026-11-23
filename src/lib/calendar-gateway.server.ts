import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const BASE = "https://connector-gateway.lovable.dev";
function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Calendar connection is unavailable.");
  return key;
}
function encryptionKey() {
  const key = process.env["APP_USER_CONNECTION_KEY_SECRET"];
  if (!key) throw new Error("Calendar encryption is unavailable.");
  return Buffer.from(key, "base64");
}
export async function authorizeCalendar(userId: string, returnUrl: string) {
  const clientKey = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if (!clientKey) throw new Error("Google Calendar client is not configured.");
  const response = await fetch(`${BASE}/api/v1/app-users/oauth2/authorize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-Client-Api-Key": clientKey,
    },
    body: JSON.stringify({
      connector_id: "google_calendar",
      app_user_id: userId,
      return_url: returnUrl,
      credentials_configuration: { scopes: SCOPES },
    }),
  });
  if (!response.ok)
    throw new Error(`Calendar connection failed (${response.status}): ${await response.text()}`);
  const result = (await response.json()) as { authorization_url?: string };
  if (!result.authorization_url) throw new Error("Calendar did not return an authorization URL.");
  return result.authorization_url;
}
export const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
export async function exchangeCalendar(userId: string, code: string) {
  const response = await fetch(`${BASE}/api/v1/app-users/oauth2/exchange`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok)
    throw new Error(`Calendar confirmation failed (${response.status}): ${await response.text()}`);
  const result = (await response.json()) as { connector_id?: string; api_key?: string };
  if (result.connector_id !== "google_calendar" || !result.api_key)
    throw new Error("Calendar consent did not return a valid connection.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(result.api_key, "utf8"), cipher.final()]);
  const stored = Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_user_connections")
    .upsert(
      {
        user_id: userId,
        connector_id: "google_calendar",
        connection_key_ciphertext: stored,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" },
    );
  if (error) throw error;
}
export async function calendarKey(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", "google_calendar")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const buf = Buffer.from(data.connection_key_ciphertext, "base64");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), buf.subarray(0, 12));
  cipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([cipher.update(buf.subarray(28)), cipher.final()]).toString("utf8");
}
export async function calendarRequest(key: string, path: string, init?: RequestInit) {
  const h = new Headers(init?.headers);
  h.set("Authorization", `Bearer ${apiKey()}`);
  h.set("X-Connection-Api-Key", key);
  h.set("X-Lovable-Required-Scopes", SCOPES.join(" "));
  return fetch(`${BASE}/google_calendar/calendar/v3/${path}`, { ...init, headers: h });
}
export async function disconnectCalendar(userId: string, key: string) {
  const response = await fetch(`${BASE}/api/v1/app-users/connection`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "X-Connection-Api-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ connector_id: "google_calendar" }),
  });
  if (!response.ok) throw new Error(`Disconnect failed (${response.status}).`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("app_user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", "google_calendar");
  if (error) throw error;
}
