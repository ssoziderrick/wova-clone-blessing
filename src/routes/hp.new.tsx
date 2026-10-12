import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { useState } from "react";
import { db, type Frequency } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Row } from "./inventory.new";
import { toast } from "sonner";

export const Route = createFileRoute("/hp/new")({
  validateSearch: (s: Record<string, unknown>) => ({ carId: s.carId ? Number(s.carId) : undefined }),
  head: () => ({ meta: [{ title: "New HP Agreement — Car Bond Manager" }] }),
  component: NewHP,
});

function NewHP() {
  const navigate = useNavigate();
  const { carId } = Route.useSearch();
  const cars = useLiveQuery(() => db.cars.where("status").anyOf("in_stock", "reserved").toArray());
  const buyers = useLiveQuery(() => db.buyers.toArray());
  const [f, setF] = useState({
    carId: carId ?? 0, buyerId: 0, sellingPrice: 0, deposit: 0, interest: 0,
    installmentAmount: 0, frequency: "monthly" as Frequency,
    startDate: "", numberOfInstallments: 0,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.carId || !f.buyerId) { toast.error("Select car and buyer"); return; }
    await db.hp.add({ ...f, status: "active", createdAt: new Date().toISOString() });
    await db.cars.update(f.carId, { status: "sold_hp", dateSold: f.startDate });
    toast.success("HP agreement created");
    navigate({ to: "/inventory/$id", params: { id: String(f.carId) } });
  }

  return (
    <AppShell title="New HP Agreement">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Car">
          <Select value={String(f.carId || "")} onValueChange={(v) => {
            const c = cars?.find((x) => x.id === +v);
            setF({ ...f, carId: +v, sellingPrice: c?.sellingPrice ?? f.sellingPrice });
          }}>
            <SelectTrigger><SelectValue placeholder="Select a car" /></SelectTrigger>
            <SelectContent>
              {cars?.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.make} {c.model} • {c.plate}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Buyer">
          <Select value={String(f.buyerId || "")} onValueChange={(v) => setF({ ...f, buyerId: +v })}>
            <SelectTrigger><SelectValue placeholder="Select a buyer" /></SelectTrigger>
            <SelectContent>
              {buyers?.map((b) => (<SelectItem key={b.id} value={String(b.id)}>{b.fullName} • {b.phone}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
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
        <Field label="Start Date (YYYY-MM-DD)"><Input type="text" placeholder="YYYY-MM-DD" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/inventory" })}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Create HP</Button>
        </div>
      </form>
    </AppShell>
  );
}
