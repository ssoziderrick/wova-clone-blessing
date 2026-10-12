import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { provisionBuyerAccount } from "@/lib/buyer-account.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, BellPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  buyerId: number;
  buyerName: string;
  buyerEmail?: string | null;
}

interface Reminder {
  id: number;
  title: string;
  message: string | null;
  scheduled_date: string;
  status: string;
}

/**
 * Manager-side control panel for a buyer's shared-backend identity.
 * The manager only enters the buyer's email here. The buyer creates their
 * own password through the secure invite link, so the manager never sees it.
 */
export function BuyerPortalAccount({ buyerId, buyerName, buyerEmail }: Props) {
  const [email, setEmail] = useState(buyerEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<string | null>(null);

  const [title, setTitle] = useState("Payment reminder");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);

  async function loadStatus() {
    const { data } = await supabase
      .from("buyers")
      .select("auth_user_id, email")
      .eq("id", buyerId)
      .maybeSingle();
    setLinked(data?.auth_user_id ? (data.email ?? "linked") : null);
    if (data?.email && !email) setEmail(data.email);
  }

  async function loadReminders() {
    const { data } = await supabase
      .from("reminders")
      .select("id, title, message, scheduled_date, status")
      .eq("buyer_id", buyerId)
      .order("scheduled_date", { ascending: false })
      .limit(10);
    setReminders((data ?? []) as Reminder[]);
  }

  useEffect(() => {
    loadStatus();
    loadReminders();
    const channel = supabase
      .channel(`buyer-${buyerId}-portal`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, loadReminders)
      .on("postgres_changes", { event: "*", schema: "public", table: "buyers" }, loadStatus)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerId]);

  async function linkEmail() {
    setBusy(true);
    try {
      const res = await provisionBuyerAccount({ data: { buyerId, email } });
      setLinked(res.email);
      toast.success("Email linked. Send an invite below so the buyer can set their own password.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link the email");
    } finally {
      setBusy(false);
    }
  }

  async function addReminder() {
    if (!title.trim()) {
      toast.error("Give the reminder a title");
      return;
    }
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) {
      toast.error("Sign in again to add reminders");
      return;
    }
    const { error } = await supabase.from("reminders").insert({
      buyer_id: buyerId,
      user_id: uid,
      created_by: uid,
      title: title.trim(),
      message: message.trim() || null,
      scheduled_date: /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : new Date().toISOString().slice(0, 10),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessage("");
    setWhen("");
    toast.success("Reminder scheduled — the buyer sees it in their portal");
    loadReminders();
  }

  return (
    <div className="mt-4 space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Buyer Portal account</h2>
      <Card>
        <CardContent className="space-y-3 p-4">
          {linked ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Linked to <span className="font-medium text-foreground">{linked}</span>. Send an invite link so the buyer can set or reset their password.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Link {buyerName}&apos;s email. The buyer will create their own password when they accept the invite below — you never need to know it.
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="pa-email">Buyer email</Label>
            <Input id="pa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@example.com" />
          </div>
          <Button className="w-full" onClick={linkEmail} disabled={busy}>
            <Mail className="mr-1 h-4 w-4" />
            {busy ? "Working…" : linked ? "Update linked email" : "Link buyer email"}
          </Button>
        </CardContent>
      </Card>

      <h2 className="pt-2 text-sm font-semibold text-muted-foreground">Reminders</h2>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="rm-title">Title</Label>
              <Input id="rm-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rm-when">Date (YYYY-MM-DD)</Label>
              <Input id="rm-when" value={when} onChange={(e) => setWhen(e.target.value)} placeholder="2026-09-01" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rm-msg">Message</Label>
            <Input id="rm-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your next installment is due." />
          </div>
          <Button variant="outline" className="w-full" onClick={addReminder}>
            <BellPlus className="mr-1 h-4 w-4" /> Schedule reminder
          </Button>
          {reminders.length > 0 && (
            <ul className="space-y-1 pt-1 text-xs">
              {reminders.map((r) => (
                <li key={r.id} className="flex justify-between border-t border-border pt-1">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground">{r.scheduled_date} • {r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
