import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { db, formatUGX, hpSummary } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, AlertCircle, MessageCircle, BellRing } from "lucide-react";
import { toast } from "sonner";

function remindClient(e: React.MouseEvent, buyerName: string, phone: string, amount: number, dueDate: string, overdue: boolean) {
  e.preventDefault();
  e.stopPropagation();
  if (!phone) { toast.error("No phone number on file for this buyer"); return; }
  const clean = phone.replace(/\D/g, "").replace(/^0/, "256");
  const msg = overdue
    ? `Hello ${buyerName}, this is a reminder that your hire-purchase installment of ${formatUGX(amount)} was due on ${dueDate} and is now overdue. Kindly clear it at your earliest convenience. — Wova Rich Investments`
    : `Hello ${buyerName}, a friendly reminder that your hire-purchase installment of ${formatUGX(amount)} is due on ${dueDate}. Thank you. — Wova Rich Investments`;
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
  toast.success(`Reminder sent to ${buyerName}`);
}

export const Route = createFileRoute("/payments/")({
  head: () => ({ meta: [{ title: "Payments — Car Bond Manager" }] }),
  component: Payments,
});

function Payments() {
  const navigate = useNavigate();
  const items = useLiveQuery(async () => {
    const hps = await db.hp.toArray();
    return Promise.all(hps.map(async (h) => {
      const car = await db.cars.get(h.carId);
      const buyer = await db.buyers.get(h.buyerId);
      const s = await hpSummary(h.id!);
      return { hp: h, car, buyer, s: s! };
    }));
  });

  const sorted = items?.slice().sort((a, b) => Number(b.s.isOverdue) - Number(a.s.isOverdue) || a.s.nextDue.localeCompare(b.s.nextDue));
  const totalOutstanding = items?.reduce((a, i) => a + i.s.balance, 0) ?? 0;
  const totalOverdue = items?.filter((i) => i.s.isOverdue).reduce((a, i) => a + i.s.balance, 0) ?? 0;

  return (
    <AppShell title="Hire Purchase">
      <div className="glass-panel relative overflow-hidden p-5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-gradient-accent opacity-25 blur-3xl" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Total HP Outstanding</p>
            <p className="font-mono-num mt-2 bg-gradient-teal bg-clip-text text-3xl font-bold text-transparent">{formatUGX(totalOutstanding)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Overdue</p>
            <p className="font-mono-num mt-2 text-2xl font-bold text-destructive">{formatUGX(totalOverdue)}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link to="/proofs">Buyer Submissions</Link>
        </Button>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/payments/new" search={{ hpId: undefined }}><Plus className="mr-1 h-4 w-4" /> Record Payment</Link>
        </Button>
      </div>


      <div className="mt-3 space-y-2">
        {sorted?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No HP agreements yet.
          </div>
        )}
        {sorted?.map(({ hp, car, buyer, s }) => (
          <Link key={hp.id} to="/hp/$id" params={{ id: String(hp.id) }}>
            <Card className={`hover:border-accent ${s.isOverdue ? "border-destructive/50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{buyer?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{car?.make} {car?.model} • {car?.plate}</p>
                  </div>
                  {s.isOverdue && (
                    <span className="flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" /> Overdue
                    </span>
                  )}
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>Balance <span className="font-semibold">{formatUGX(s.balance)}</span></span>
                  <span className="text-muted-foreground">Due {s.nextDue}</span>
                </div>
                <Progress value={s.percent} className="mt-2 h-1.5" />
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => remindClient(e, buyer?.fullName ?? "Customer", buyer?.phone ?? "", hp.installmentAmount, s.nextDue, s.isOverdue)}
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> Remind client
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast(`${buyer?.fullName}: ${formatUGX(s.balance)} due ${s.nextDue}`, { icon: <BellRing className="h-4 w-4" /> }); }}
                  >
                    <BellRing className="mr-1 h-3.5 w-3.5" /> Manager alert
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate({ to: "/hp/$id/edit", params: { id: String(hp.id) } }); }}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
