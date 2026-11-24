import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, LogOut, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function MemberSecuritySettings({ email }: { email: string }) {
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setNewEmail("");
      toast.success("Check your inbox to confirm the new email address.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your email.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters for your new password.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Your password has been changed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <section className="rounded-3xl bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6 text-primary" />
        <div>
          <h2 className="font-display text-xl font-bold">Account security</h2>
          <p className="text-sm text-muted-foreground">
            Manage the email and password used to access your account.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <form onSubmit={changeEmail} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current email
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1.5 block w-full rounded-xl border bg-muted px-3 py-3 text-sm font-normal normal-case text-foreground"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New email
            <input
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="mt-1.5 block w-full rounded-xl border bg-background px-3 py-3 text-sm font-normal normal-case text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <button
            disabled={savingEmail}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {savingEmail ? "Sending confirmation…" : "Change email"}
          </button>
        </form>

        <form onSubmit={changePassword} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1.5 block w-full rounded-xl border bg-background px-3 py-3 text-sm font-normal normal-case text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 block w-full rounded-xl border bg-background px-3 py-3 text-sm font-normal normal-case text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <button
            disabled={savingPassword}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {savingPassword ? "Updating…" : "Change password"}
          </button>
        </form>
      </div>

      <div className="mt-8 border-t pt-5">
        <button
          type="button"
          onClick={signOutEverywhere}
          disabled={signingOut}
          className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out on all devices"}
        </button>
      </div>
    </section>
  );
}
