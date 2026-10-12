import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, getSetting, setSetting } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileDown, FileUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InstallAppButton } from "@/components/InstallAppButton";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Car Bond Manager" }] }),
  component: Settings,
});

function Settings() {
  const [buyerPortalUrl, setBuyerPortalUrl] = useState("");
  const [bizName, setBizName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const [reminderDays, setReminderDays] = useState("30");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    (async () => {
      setBizName((await getSetting("bizName")) ?? "");
      setReminderDays((await getSetting("reminderDays")) ?? "30");
      setBuyerPortalUrl((await getSetting("buyerPortalUrl")) ?? "");
      const raw = await getSetting("dark");
      const d = raw === null ? true : raw === "1";
      setDark(d);
      document.documentElement.classList.toggle("dark", d);
      const { data } = await supabase.auth.getUser();
      setCurrentEmail(data.user?.email ?? "");
    })();
  }, []);

  async function changeEmail() {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: window.location.origin },
      );
      if (error) throw error;
      toast.success("Confirmation sent — check both your old and new inbox to confirm the change");
      setNewEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update email");
    } finally {
      setChangingEmail(false);
    }
  }

  async function save() {
    await setSetting("bizName", bizName);
    await setSetting("reminderDays", reminderDays);
    await setSetting("buyerPortalUrl", buyerPortalUrl.trim().replace(/\/$/, ""));
    toast.success("Settings saved");
  }
  async function toggleDark(v: boolean) {
    setDark(v);
    await setSetting("dark", v ? "1" : "0");
    document.documentElement.classList.toggle("dark", v);
  }
  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function backup() {
    const data = {
      cars: await db.cars.toArray(),
      buyers: await db.buyers.toArray(),
      hp: await db.hp.toArray(),
      payments: await db.payments.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carbond_backup_${Date.now()}.json`;
    a.click();
    toast.success("Backup downloaded");
  }
  async function restore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await db.transaction("rw", db.cars, db.buyers, db.hp, db.payments, async () => {
        await db.cars.clear(); await db.buyers.clear(); await db.hp.clear(); await db.payments.clear();
        if (data.cars) await db.cars.bulkAdd(data.cars);
        if (data.buyers) await db.buyers.bulkAdd(data.buyers);
        if (data.hp) await db.hp.bulkAdd(data.hp);
        if (data.payments) await db.payments.bulkAdd(data.payments);
      });
      toast.success("Database restored");
    } catch { toast.error("Invalid backup file"); }
  }

  return (
    <AppShell title="Settings">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <Label className="text-xs">Business Name</Label>
            <Input value={bizName} onChange={(e) => setBizName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Reminder cadence (days before due)</Label>
            <Input value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} placeholder="30" />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated days before each due date. Default <b>30</b> = remind monthly.</p>
          </div>
          <div>
            <Label className="text-xs">Buyer Portal URL</Label>
            <Input value={buyerPortalUrl} onChange={(e) => setBuyerPortalUrl(e.target.value)} placeholder="https://your-buyer-app.lovable.app" />
            <p className="mt-1 text-xs text-muted-foreground">Base URL of your buyer portal app. Buyer links become <code>&lt;url&gt;/b/&lt;token&gt;</code>.</p>
          </div>
          <Button onClick={save} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground">Easier on the eyes at night</p>
          </div>
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="font-medium">Account Email</p>
            <p className="text-xs text-muted-foreground">
              Currently signed in as <b>{currentEmail || "—"}</b>
            </p>
          </div>
          <div>
            <Label className="text-xs">New email address</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@business.com"
              autoComplete="email"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              You'll receive a confirmation link in both your current and new inbox. The change takes effect once confirmed.
            </p>
          </div>
          <Button
            onClick={changeEmail}
            disabled={changingEmail || !newEmail}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {changingEmail ? "Sending confirmation…" : "Change Email"}
          </Button>
        </CardContent>
      </Card>


      <Card className="mt-3">
        <CardContent className="space-y-2 p-4">
          <p className="font-medium">Backup & Restore</p>
          <Button variant="outline" onClick={backup} className="w-full"><FileDown className="mr-2 h-4 w-4" /> Backup Database</Button>
          <label className="block">
            <input type="file" accept="application/json" className="hidden" onChange={restore} />
            <span className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent/10">
              <FileUp className="mr-2 h-4 w-4" /> Restore from file
            </span>
          </label>
        </CardContent>
      </Card>

      <Card className="mt-3">
        <CardContent className="space-y-2 p-4">
          <p className="font-medium">Install App</p>
          <p className="text-xs text-muted-foreground">
            Install Car Bond Manager on this device so it opens in its own window, with its own icon
            in the Start Menu and taskbar.
          </p>
          <InstallAppButton />
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="mt-3 w-full">
        <Link to="/reports"><FileText className="mr-2 h-4 w-4" /> Reports</Link>
      </Button>
      <Button variant="outline" className="mt-2 w-full" onClick={signOut}>
        Sign out
      </Button>


      <p className="mt-6 text-center text-xs text-muted-foreground">Car Bond Manager v1.0 • Offline-first</p>
    </AppShell>
  );
}
