import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/wova-rich-logo.jpeg.asset.json";
import { Loader2 } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

export function SignInScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in on this device");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-app-bg)" }} />
      <div className="absolute -z-10 h-[60vmin] w-[60vmin] rounded-full bg-gradient-primary opacity-30 blur-3xl animate-breath" />

      <form onSubmit={submit} className="glass-panel relative flex w-full max-w-[380px] flex-col items-center p-7">
        <div className="relative mb-4">
          <div className="absolute -inset-2 rounded-full bg-gradient-primary opacity-60 blur-xl animate-breath" />
          <img src={logo.url} alt="Wova Rich Investments" className="relative h-20 w-20 rounded-full object-cover ring-2 ring-white/40 shadow-tile" />
        </div>
        <h1 className="text-3xl font-bold tracking-[0.28em]">WOVA</h1>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Wova Rich Investments LTD</p>
        <p className="mt-3 text-sm text-foreground/80">
          {mode === "signin" ? "Sign in to sync across devices" : "Create your business account"}
        </p>

        <div className="mt-5 w-full space-y-3">
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              autoComplete="email"
              className="border-white/15 bg-white/5"
            />
          </div>
          <div>
            <Label className="text-xs">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="border-white/15 bg-white/5"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="mt-5 h-11 w-full bg-gradient-teal text-primary-foreground">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign In" : "Create Account"}
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-xs font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        <InstallAppButton className="mt-5" />

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Sign in with the same email on every device to keep inventory, buyers,
          and payments in sync automatically.
        </p>
      </form>
    </div>
  );
}
