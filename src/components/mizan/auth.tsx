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

const AuthContext = createContext<{ user: User | null; ready: boolean; recovery: boolean }>({
  user: null,
  ready: false,
  recovery: false,
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Reset links sign the user in with a recovery session; flag it so the new-password form opens.
      if (event === "PASSWORD_RECOVERY") {
        setUser(session?.user ?? null);
        setReady(true);
        setRecovery(true);
        return;
      }
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
  return <AuthContext.Provider value={{ user, ready, recovery }}>{children}</AuthContext.Provider>;
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
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, recovery } = useMizanAuth();
  useEffect(() => {
    const hash = window.location.hash;
    if (recovery || hash.includes("type=recovery")) setMode("password");
  }, [recovery]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((mode === "signup" || mode === "password") && password !== confirm) {
      toast.error("Passwords don't match. Please type the same password twice.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
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
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.user && data.user.identities?.length === 0) {
          toast.error("This email already has an account. Sign in, or tap Forgot password to set a password.");
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
              {(mode === "signup" || mode === "password") && (
                <label className="grid gap-2 text-xs">
                  Confirm password
                  <input
                    className="field"
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
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

function friendlyAuthError(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "Email or password is wrong. Tap Forgot password if you need a new one.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/token has expired|invalid.*(otp|token)/i.test(msg)) return "That code is wrong or expired. Ask for a new code.";
  if (/weak|easy to guess|pwned/i.test(msg)) return "That password is too common and easy to guess. Please choose a stronger one (mix words, numbers and symbols).";
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Please wait a minute and try again.";
  if (/already registered/i.test(msg)) return "This email already has an account. Please sign in instead.";
  return msg;
}
