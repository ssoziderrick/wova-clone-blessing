import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type Frequency, type HpStatus } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Row } from "./inventory.new";
import { toast } from "sonner";

export const Route = createFileRoute("/hp/$id/edit")({
  head: () => ({ meta: [{ title: "Edit HP Agreement — Car Bond Manager" }] }),
  component: EditHP,
});

function EditHP() {
  const { id } = Route.useParams();
  const hpId = +id;
  const navigate = useNavigate();
  const [f, setF] = useState<null | {
    sellingPrice: number; deposit: number; interest: number; installmentAmount: number;
    frequency: Frequency; startDate: string; numberOfInstallments: number; status: HpStatus;
  }>(null);

  useEffect(() => {
    (async () => {
      const h = await db.hp.get(hpId);
      if (!h) { toast.error("Agreement not found"); navigate({ to: "/payments" }); return; }
      setF({
        sellingPrice: h.sellingPrice ?? 0, deposit: h.deposit ?? 0, interest: h.interest ?? 0,
        installmentAmount: h.installmentAmount ?? 0, frequency: h.frequency ?? "monthly",
        startDate: h.startDate ?? "", numberOfInstallments: h.numberOfInstallments ?? 0,
        status: h.status ?? "active",
      });
    })();
  }, [hpId, navigate]);

  if (!f) return <AppShell title="Loading…"><div /></AppShell>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    await db.hp.update(hpId, f);
    toast.success("Agreement updated");
    navigate({ to: "/payments" });
  }

  return (
    <AppShell title="Edit HP Agreement">
      <form onSubmit={submit} className="space-y-3">
        <Row>
          <Field label="Selling Price"><Input type="number" inputMode="numeric" placeholder="0" value={f.sellingPrice === 0 ? "" : f.sellingPrice} onChange={(e) => setF({ ...f, sellingPrice: e.target.value === "" ? 0 : +e.target.value })} /></Field>
          <Field label="Deposit"><Input type="number" inputMode="numeric" placeholder="0" value={f.deposit === 0 ? "" : f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value === "" ? 0 : +e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Interest %"><Input type="number" inputMode="numeric" placeholder="0" value={f.interest === 0 ? "" : f.interest} onChange={(e) => setF({ ...f, interest: e.target.value === "" ? 0 : +e.target.value })} /></Field>
          <Field label="# Installments"><Input type="number" inputMode="numeric" placeholder="0" value={f.numberOfInstallments === 0 ? "" : f.numberOfInstallments} onChange={(e) => setF({ ...f, numberOfInstallments: e.target.value === "" ? 0 : +e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Installment Amount"><Input type="number" inputMode="numeric" placeholder="0" value={f.installmentAmount === 0 ? "" : f.installmentAmount} onChange={(e) => setF({ ...f, installmentAmount: e.target.value === "" ? 0 : +e.target.value })} /></Field>
          <Field label="Frequency">
            <Select value={f.frequency} onValueChange={(v) => setF({ ...f, frequency: v as Frequency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Row>
        <Row>
          <Field label="Start Date (YYYY-MM-DD)"><Input type="text" placeholder="YYYY-MM-DD" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as HpStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Row>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/payments" })}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
        </div>
      </form>
    </AppShell>
  );
}
