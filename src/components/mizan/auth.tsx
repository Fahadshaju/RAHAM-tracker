import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const AuthContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        setUser(session?.user ?? null);
        setReady(true);
        if (event === "SIGNED_OUT") queryClient.removeQueries({ queryKey: ["private"] });
        else if (event !== "INITIAL_SESSION")
          void queryClient.invalidateQueries({ queryKey: ["private"] });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}
export const useMizanAuth = () => useContext(AuthContext);
export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "password">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const { user } = useMizanAuth();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setMode("password");
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success("Check your email for a password reset link.");
      } else if (mode === "password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated.");
        onOpenChange(false);
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
        else onOpenChange(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onOpenChange(false);
        toast.success("Your private RAHAM is ready.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {user
              ? "Your account"
              : mode === "signup"
                ? "Begin your RAHAM"
                : mode === "reset"
                  ? "Reset your password"
                  : mode === "password"
                    ? "Choose a new password"
                    : "Return to your RAHAM"}
          </DialogTitle>
          <DialogDescription>
            {user ? (user.email || user.phone) : "Your journal and prayer proof stay private."}
          </DialogDescription>
        </DialogHeader>
        {user && mode !== "password" ? (
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              onOpenChange(false);
            }}
          >
            Sign out
          </Button>
        ) : usePhone && mode !== "password" ? (
          <>
            <PhoneSignIn onDone={() => onOpenChange(false)} />
            <Button size="sm" variant="link" onClick={() => setUsePhone(false)}>Use email instead</Button>
          </>
        ) : (
          <>
            {mode !== "password" && (
              <Button type="button" variant="outline" onClick={() => setUsePhone(true)}>Continue with phone number</Button>
            )}
            <form onSubmit={(e) => void submit(e)} className="grid gap-3">
              {mode !== "password" && (
                <label className="grid gap-2 text-xs">
                  Email
                  <input
                    className="field"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label className="grid gap-2 text-xs">
                  Password
                  <input
                    className="field"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </label>
              )}
              <Button type="submit" variant="glow" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset link"
                      : mode === "password"
                        ? "Update password"
                        : "Sign in"}
              </Button>
            </form>
            <div className="flex justify-between">
              <Button
                size="sm"
                variant="link"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Already have an account?" : "Create an account"}
              </Button>
              <Button size="sm" variant="link" onClick={() => setMode("reset")}>
                Forgot password?
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Phone sign-in: text a one-time code, then verify it. New numbers get an account automatically.
function PhoneSignIn({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const clean = phone.replace(/[\s-]/g, "");
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^\+\d{8,15}$/.test(clean)) { toast.error("Enter your number with country code, e.g. +919876543210."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: clean });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Code sent by SMS.");
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: clean, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Your private RAHAM is ready.");
    onDone();
  }
  return sent ? (
    <form onSubmit={(e) => void verify(e)} className="grid gap-3">
      <label className="grid gap-2 text-xs">
        Code sent to {clean}
        <input className="field tracking-[0.3em] text-center" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
      </label>
      <Button type="submit" variant="glow" disabled={busy || code.length < 4}>{busy ? "Please wait…" : "Verify and sign in"}</Button>
      <div className="flex justify-between">
        <Button type="button" size="sm" variant="link" onClick={() => { setSent(false); setCode(""); }}>Change number</Button>
        <Button type="button" size="sm" variant="link" disabled={busy} onClick={() => void send()}>Resend code</Button>
      </div>
    </form>
  ) : (
    <form onSubmit={(e) => void send(e)} className="grid gap-3">
      <label className="grid gap-2 text-xs">
        Phone number
        <input className="field" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <Button type="submit" variant="glow" disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
    </form>
  );
}
