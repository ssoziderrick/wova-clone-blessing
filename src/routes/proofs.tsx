import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db, formatUGX } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/proofs")({
  head: () => ({ meta: [{ title: "Buyer Submissions — Car Bond Manager" }] }),
  component: Proofs,
});

interface ProofRow {
  id: number;
  hp_id: number;
  amount: number;
  date: string;
  method: string;
  reference: string | null;
  notes: string | null;
  image_path: string | null;
  status: string;
  created_at: string;
  imageUrl?: string;
  buyerName?: string;
  plate?: string;
}

function Proofs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("payment_proofs")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as ProofRow[];
    for (const r of list) {
      if (r.image_path) {
        const { data: signed } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(r.image_path, 3600);
        r.imageUrl = signed?.signedUrl;
      }
      const hp = await db.hp.get(r.hp_id);
      if (hp) {
        const b = await db.buyers.get(hp.buyerId);
        const c = await db.cars.get(hp.carId);
        r.buyerName = b?.fullName;
        r.plate = c?.plate;
      }
    }
    setRows(list);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(r: ProofRow) {
    await db.payments.add({
      hpId: r.hp_id,
      date: r.date,
      amount: Number(r.amount),
      method: r.method,
      reference: r.reference ?? "",
      notes: (r.notes ?? "") + " (from buyer submission)",
      createdAt: new Date().toISOString(),
    });
    await supabase.from("payment_proofs").update({ status: "approved" }).eq("id", r.id);
    toast.success("Payment approved and recorded");
    load();
  }
  async function reject(r: ProofRow) {
    await supabase.from("payment_proofs").update({ status: "rejected" }).eq("id", r.id);
    toast.success("Submission rejected");
    load();
  }

  return (
    <AppShell title="Buyer Submissions">
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No buyer submissions yet.
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className={r.status !== "pending" ? "opacity-60" : ""}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{r.buyerName ?? `HP #${r.hp_id}`} {r.plate && `• ${r.plate}`}</p>
                  <p className="text-xs text-muted-foreground">{r.date} • {r.method}{r.reference ? ` • Ref ${r.reference}` : ""}</p>
                </div>
                <p className="font-mono-num font-bold">{formatUGX(Number(r.amount))}</p>
              </div>
              {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
              {r.imageUrl && (
                <a href={r.imageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-accent underline">
                  <ImageIcon className="h-3 w-3" /> View proof image
                </a>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs uppercase tracking-wider ${r.status === "pending" ? "text-yellow-500" : r.status === "approved" ? "text-emerald-500" : "text-destructive"}`}>
                  {r.status}
                </span>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => reject(r)}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => approve(r)}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" className="mt-4 w-full" onClick={() => navigate({ to: "/payments" })}>Back to Payments</Button>
    </AppShell>
  );
}
