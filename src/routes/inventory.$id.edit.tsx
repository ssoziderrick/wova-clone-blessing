import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type CarStatus } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Row } from "./inventory.new";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Car — Car Bond Manager" }] }),
  component: EditCar,
});

function EditCar() {
  const { id } = Route.useParams();
  const carId = +id;
  const navigate = useNavigate();
  const [f, setF] = useState<null | {
    make: string; model: string; year: number; color: string; plate: string;
    vin: string; engineNumber: string; buyingPrice: number; sellingPrice: number;
    datePurchased: string; dateSold: string; status: CarStatus; notes: string;
  }>(null);

  useEffect(() => {
    (async () => {
      const c = await db.cars.get(carId);
      if (!c) { toast.error("Car not found"); navigate({ to: "/inventory" }); return; }
      setF({
        make: c.make ?? "", model: c.model ?? "", year: c.year ?? 0, color: c.color ?? "",
        plate: c.plate ?? "", vin: c.vin ?? "", engineNumber: c.engineNumber ?? "",
        buyingPrice: c.buyingPrice ?? 0, sellingPrice: c.sellingPrice ?? 0,
        datePurchased: c.datePurchased ?? "", dateSold: c.dateSold ?? "",
        status: c.status ?? "in_stock", notes: c.notes ?? "",
      });
    })();
  }, [carId, navigate]);

  if (!f) return <AppShell title="Loading…"><div /></AppShell>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    if (!f.make || !f.model || !f.plate) { toast.error("Make, model and plate are required"); return; }
    await db.cars.update(carId, f);
    toast.success("Car updated");
    navigate({ to: "/inventory/$id", params: { id } });
  }

  return (
    <AppShell title="Edit Car">
      <form onSubmit={submit} className="space-y-3">
        <Row>
          <Field label="Make"><Input value={f.make} onChange={(e) => setF({ ...f, make: e.target.value })} /></Field>
          <Field label="Model"><Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Year"><Input type="number" value={f.year || ""} onChange={(e) => setF({ ...f, year: e.target.value === "" ? 0 : +e.target.value })} /></Field>
          <Field label="Color"><Input value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
        </Row>
        <Field label="Plate Number"><Input value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} /></Field>
        <Row>
          <Field label="VIN"><Input value={f.vin} onChange={(e) => setF({ ...f, vin: e.target.value })} /></Field>
          <Field label="Engine #"><Input value={f.engineNumber} onChange={(e) => setF({ ...f, engineNumber: e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Buying Price (UGX)"><Input type="number" inputMode="numeric" placeholder="0" value={f.buyingPrice === 0 ? "" : f.buyingPrice} onChange={(e) => setF({ ...f, buyingPrice: e.target.value === "" ? 0 : +e.target.value })} /></Field>
          <Field label="Selling Price (UGX)"><Input type="number" inputMode="numeric" placeholder="0" value={f.sellingPrice === 0 ? "" : f.sellingPrice} onChange={(e) => setF({ ...f, sellingPrice: e.target.value === "" ? 0 : +e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Date Added to Stock (YYYY-MM-DD)"><Input type="text" placeholder="YYYY-MM-DD" value={f.datePurchased} onChange={(e) => setF({ ...f, datePurchased: e.target.value })} /></Field>
          <Field label="Date Sold (YYYY-MM-DD)"><Input type="text" placeholder="YYYY-MM-DD" value={f.dateSold} onChange={(e) => setF({ ...f, dateSold: e.target.value })} /></Field>
        </Row>
        <Field label="Status">
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as CarStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="sold_cash">Sold (Cash)</SelectItem>
              <SelectItem value="sold_hp">Sold (HP)</SelectItem>
              <SelectItem value="sold_completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Notes"><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/inventory/$id", params: { id } })}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
        </div>
      </form>
    </AppShell>
  );
}
