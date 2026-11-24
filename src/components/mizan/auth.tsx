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
        if (data.user && data.user.identities?.length === 0) {
          toast.error("This email already has an account (maybe via Google). Use Continue with Google, or tap Forgot password to set a password.");
          setMode("signin");
        } else if (!data.session) toast.success("Check your email to confirm your account.");
        else onOpenChange(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onOpenChange(false);
        toast.success("Your private RAHAM is ready.");
      }
    } catch (e) {
      toast.error(friendlyAuthError(e instanceof Error ? e.message : "Sign-in failed."));
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
            {user ? user.email : "Your journal and prayer proof stay private."}
          </DialogDescription>
        </DialogHeader>
        {user && mode !== "password" ? (
          <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            {user.user_metadata?.["avatar_url"] || user.user_metadata?.["picture"] ? (
              <img src={user.user_metadata["avatar_url"] || user.user_metadata["picture"]} alt="" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full" />
            ) : <span />}
            <span className="min-w-0 truncate text-sm">{user.user_metadata?.["full_name"] || user.user_metadata?.["name"] || user.email}</span>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              onOpenChange(false);
            }}
          >
            Sign out
          </Button>
          </>
        ) : (
          <>
            {mode !== "password" && (
              <>
                <GoogleButton />
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
              </>
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

const G_LOGO = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

// Lovable-hosted sites use managed Google sign-in; other hosts (e.g. Vercel) go straight to the backend.
function GoogleButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const host = window.location.hostname;
      const managed = host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") || host === "localhost" || host === "127.0.0.1";
      if (managed) {
        const { lovable } = await import("@/integrations/lovable/index");
        const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
        if (r.error) throw r.error;
      } else {
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
        if (error) throw error;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally { setBusy(false); }
  }
  return (
    <Button type="button" onClick={() => void go()} disabled={busy}
      className="h-10 gap-[10px] px-3 border border-[#8E918F] bg-[#131314] text-[#E3E3E3] hover:bg-[#1f1f20] font-medium text-sm">
      {G_LOGO}
      {busy ? "Opening Google…" : "Continue with Google"}
    </Button>
  );
}

function friendlyAuthError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email or password is wrong. If you signed up with Google, use Continue with Google or tap Forgot password to set a password.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/token has expired|invalid.*(otp|token)/i.test(msg)) return "That code is wrong or expired. Ask for a new code.";
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Please wait a minute and try again.";
  if (/already registered/i.test(msg)) return "This email already has an account. Please sign in instead.";
  return msg;
}
