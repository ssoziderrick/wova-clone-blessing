import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { db, formatUGX, hpSummary, getSetting, type Payment } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/hp/$id/")({
  head: () => ({ meta: [{ title: "HP Agreement — Car Bond Manager" }] }),
  component: HpDetail,
});

function HpDetail() {
  const { id } = Route.useParams();
  const hpId = +id;
  const navigate = useNavigate();

  const data = useLiveQuery(async () => {
    const hp = await db.hp.get(hpId);
    if (!hp) return null;
    const car = await db.cars.get(hp.carId);
    const buyer = await db.buyers.get(hp.buyerId);
    const summary = await hpSummary(hpId);
    const payments = (await db.payments.where("hpId").equals(hpId).toArray()) as Payment[];
    payments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { hp, car, buyer, summary, payments };
  }, [hpId]);

  if (data === undefined) return <AppShell title="Loading…"><div /></AppShell>;
  if (data === null) return <AppShell title="Not found"><p>Agreement not found.</p></AppShell>;
  const { hp, car, buyer, summary, payments } = data;
  if (!summary) return <AppShell title="Loading…"><div /></AppShell>;

  async function removePayment(pid: number) {
    await db.payments.delete(pid);
    toast.success("Payment removed");
  }

  async function copyBuyerLink() {
    const token = (hp as { shareToken?: string }).shareToken;
    if (!token) { toast.error("No share token"); return; }
    const base = ((await getSetting("buyerPortalUrl")) ?? "").replace(/\/$/, "");
    const link = base ? `${base}/b/${token}` : token;
    await navigator.clipboard.writeText(link);
    toast.success(base ? "Buyer link copied" : "Token copied — set Buyer Portal URL in Settings");
  }


  return (
    <AppShell title={`${buyer?.fullName ?? "Buyer"} — HP`}>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{car?.make} {car?.model} • {car?.plate}</p>
              <p className="text-xs text-muted-foreground">Buyer: {buyer?.fullName} • {buyer?.phone}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyBuyerLink}><Share2 className="mr-1 h-3.5 w-3.5" /> Buyer link</Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/hp/$id/edit" params={{ id }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <Info label="Selling Price" value={formatUGX(hp.sellingPrice)} />
            <Info label="Deposit" value={formatUGX(hp.deposit)} />
            <Info label="Interest %" value={String(hp.interest)} />
            <Info label="Installment" value={`${formatUGX(hp.installmentAmount)} / ${hp.frequency}`} />
            <Info label="Paid" value={formatUGX(summary.paid)} />
            <Info label="Balance" value={formatUGX(summary.balance)} />
            <Info label="Start" value={hp.startDate} />
            <Info label="Next due" value={summary.nextDue} />
          </div>
          <Progress value={summary.percent} className="mt-2 h-2" />
          <p className="text-xs text-muted-foreground">{summary.percent.toFixed(0)}% paid</p>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Payments ({payments.length})</h2>
        <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/payments/new" search={{ hpId }}><Plus className="mr-1 h-4 w-4" /> Record</Link>
        </Button>
      </div>

      <div className="mt-2 space-y-2">
        {payments.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No installment payments recorded yet.
          </div>
        )}
        {payments.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-semibold">{formatUGX(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.date || "—"} • {p.method}{p.reference ? ` • Ref ${p.reference}` : ""}
                </p>
                {p.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{p.notes}</p>}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="shrink-0"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this payment?</AlertDialogTitle>
                    <AlertDialogDescription>The balance will be recalculated.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removePayment(p.id!)}>Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="mt-4 w-full" onClick={() => navigate({ to: "/payments" })}>
        Back to Payments
      </Button>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
