import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { useState } from "react";
import { db, formatUGX, hpSummary, type PaymentMethod } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Row } from "./inventory.new";
import { toast } from "sonner";

export const Route = createFileRoute("/payments/new")({
  validateSearch: (s: Record<string, unknown>) => ({ hpId: s.hpId ? Number(s.hpId) : undefined }),
  head: () => ({ meta: [{ title: "Record Payment — Car Bond Manager" }] }),
  component: NewPayment,
});

function NewPayment() {
  const navigate = useNavigate();
  const { hpId: initial } = Route.useSearch();
  const [hpId, setHpId] = useState(initial ?? 0);
  const [f, setF] = useState({
    date: "",
    amount: 0, method: "cash" as PaymentMethod, reference: "", notes: "",
  });

  const choices = useLiveQuery(async () => {
    const hps = await db.hp.toArray();
    hps.sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0));
    return Promise.all(hps.map(async (h) => {
      const buyer = await db.buyers.get(h.buyerId);
      const car = await db.cars.get(h.carId);
      const suffix = h.status === "completed" ? " ✓" : h.status === "overdue" ? " ⚠" : "";
      return { id: h.id!, label: `${buyer?.fullName ?? "?"} — ${car?.make ?? ""} ${car?.model ?? ""} (${car?.plate ?? ""})${suffix}`, installment: h.installmentAmount };
    }));
  });

  const detail = useLiveQuery(async () => (hpId ? await hpSummary(hpId) : null), [hpId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hpId || !f.amount) { toast.error("Select HP and enter amount"); return; }
    await db.payments.add({ ...f, hpId, createdAt: new Date().toISOString() });
    const after = await hpSummary(hpId);
    if (after && after.balance <= 0) {
      await db.hp.update(hpId, { status: "completed" });
      const hp = await db.hp.get(hpId);
      if (hp) await db.cars.update(hp.carId, { status: "sold_completed" });
      toast.success("Payment recorded — agreement completed!");
    } else {
      toast.success("Payment recorded");
    }
    navigate({ to: "/payments" });
  }

  return (
    <AppShell title="Record Payment">
      <form onSubmit={submit} className="space-y-3">
        <Field label="HP Agreement">
          <Select value={String(hpId || "")} onValueChange={(v) => {
            const c = choices?.find((x) => x.id === +v);
            setHpId(+v);
            if (c && !f.amount) setF({ ...f, amount: c.installment });
          }}>
            <SelectTrigger><SelectValue placeholder="Select agreement" /></SelectTrigger>
            <SelectContent>
              {choices?.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>

        {detail && (
          <Card>
            <CardContent className="p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span className="font-semibold">{formatUGX(detail.balance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Next due</span><span>{detail.nextDue}</span></div>
            </CardContent>
          </Card>
        )}

        <Row>
          <Field label="Date (YYYY-MM-DD)"><Input type="text" placeholder="YYYY-MM-DD" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Amount"><Input type="number" inputMode="numeric" placeholder="0" value={f.amount === 0 ? "" : f.amount} onChange={(e) => setF({ ...f, amount: e.target.value === "" ? 0 : +e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Method">
            <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v as PaymentMethod })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reference #"><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
        </Row>
        <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/payments" })}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Save Payment</Button>
        </div>
      </form>
    </AppShell>
  );
}
