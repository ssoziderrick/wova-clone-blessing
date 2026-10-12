import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { db, formatUGX, hpSummary } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "./inventory.index";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory/$id/")({
  head: () => ({ meta: [{ title: "Car Details — Car Bond Manager" }] }),
  component: CarDetail,
});

function CarDetail() {
  const { id } = Route.useParams();
  const carId = +id;
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    const car = await db.cars.get(carId);
    if (!car) return null;
    const hp = await db.hp.where("carId").equals(carId).first();
    const summary = hp?.id ? await hpSummary(hp.id) : null;
    const buyer = hp ? await db.buyers.get(hp.buyerId) : null;
    return { car, hp, summary, buyer };
  }, [carId]);

  if (data === undefined) return <AppShell title="Loading…"><div /></AppShell>;
  if (data === null) return <AppShell title="Not found"><p>Car not found.</p></AppShell>;
  const { car, hp, summary, buyer } = data;

  async function remove() {
    await db.cars.delete(carId);
    if (hp?.id) {
      await db.payments.where("hpId").equals(hp.id).delete();
      await db.hp.delete(hp.id);
    }
    toast.success("Car deleted");
    navigate({ to: "/inventory" });
  }

  return (
    <AppShell title={`${car.make} ${car.model}`}>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{car.make} {car.model} ({car.year})</p>
              <p className="text-xs text-muted-foreground">{car.plate} • {car.color}</p>
            </div>
            <StatusBadge status={car.status} />
          </div>
          <Info label="VIN" value={car.vin || "—"} />
          <Info label="Engine #" value={car.engineNumber || "—"} />
          <Info label="Buying Price" value={formatUGX(car.buyingPrice)} />
          <Info label="Selling Price" value={formatUGX(car.sellingPrice)} />
          <Info label="Date Added to Stock" value={car.datePurchased || "—"} />
          {car.dateSold && <Info label="Date Sold" value={car.dateSold} />}
          {car.notes && <Info label="Notes" value={car.notes} />}
        </CardContent>
      </Card>

      {hp && summary && buyer ? (
        <Card className="mt-3">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Hire Purchase</p>
            <p className="font-semibold">Buyer: <Link to="/customers/$id" params={{ id: String(buyer.id) }} className="text-accent">{buyer.fullName}</Link></p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Paid" value={formatUGX(summary.paid)} />
              <Info label="Balance" value={formatUGX(summary.balance)} />
              <Info label="Installment" value={`${formatUGX(hp.installmentAmount)} / ${hp.frequency}`} />
              <Info label="Next due" value={summary.nextDue} />
            </div>
            <Progress value={summary.percent} className="h-2" />
            <p className="text-xs text-muted-foreground">{summary.percent.toFixed(0)}% paid</p>
            <div className="mt-2 flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/hp/$id" params={{ id: String(hp.id) }}>View Payments</Link>
              </Button>
              <Button asChild className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/payments/new" search={{ hpId: hp.id }}>Record Payment</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : car.status === "in_stock" || car.status === "reserved" ? (
        <Button asChild className="mt-3 w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/hp/new" search={{ carId: car.id }}>Sell on Hire Purchase</Link>
        </Button>
      ) : null}

      <Button asChild variant="outline" className="mt-3 w-full">
        <Link to="/inventory/$id/edit" params={{ id: String(carId) }}>Edit Car</Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-4 w-full">Delete Car</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this car?</AlertDialogTitle>
            <AlertDialogDescription>This also removes its HP record and payments. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
