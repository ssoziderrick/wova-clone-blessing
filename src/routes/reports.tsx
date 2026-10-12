import { createFileRoute } from "@tanstack/react-router";
import { db, formatUGX, hpSummary } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportPDF, exportXLSX } from "@/lib/export";
import { FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Car Bond Manager" }] }),
  component: Reports,
});

async function buildInventory() {
  const cars = await db.cars.toArray();
  return {
    title: "Inventory Report",
    headers: ["Make", "Model", "Year", "Plate", "Status", "Buying", "Selling"],
    rows: cars.map((c) => [c.make, c.model, c.year, c.plate, c.status, c.buyingPrice, c.sellingPrice]),
  };
}
async function buildSales() {
  const cars = await db.cars.filter((c) => c.status !== "in_stock" && c.status !== "reserved").toArray();
  return {
    title: "Sales Report",
    headers: ["Make", "Model", "Plate", "Status", "Selling Price"],
    rows: cars.map((c) => [c.make, c.model, c.plate, c.status, c.sellingPrice]),
  };
}
async function buildOutstanding() {
  const hps = await db.hp.toArray();
  const rows: (string | number)[][] = [];
  for (const h of hps) {
    const s = await hpSummary(h.id!);
    if (!s || s.balance <= 0) continue;
    const buyer = await db.buyers.get(h.buyerId);
    const car = await db.cars.get(h.carId);
    rows.push([buyer?.fullName ?? "?", `${car?.make ?? ""} ${car?.model ?? ""}`, car?.plate ?? "", s.balance, s.nextDue]);
  }
  return { title: "Outstanding Balances", headers: ["Buyer", "Vehicle", "Plate", "Balance UGX", "Next Due"], rows };
}
async function buildOverdue() {
  const hps = await db.hp.toArray();
  const rows: (string | number)[][] = [];
  for (const h of hps) {
    const s = await hpSummary(h.id!);
    if (!s?.isOverdue) continue;
    const buyer = await db.buyers.get(h.buyerId);
    const car = await db.cars.get(h.carId);
    rows.push([buyer?.fullName ?? "?", `${car?.make ?? ""} ${car?.model ?? ""}`, car?.plate ?? "", s.balance, s.nextDue]);
  }
  return { title: "Overdue Payments", headers: ["Buyer", "Vehicle", "Plate", "Balance UGX", "Due Since"], rows };
}
async function buildCompleted() {
  const hps = await db.hp.where("status").equals("completed").toArray();
  const rows: (string | number)[][] = [];
  for (const h of hps) {
    const buyer = await db.buyers.get(h.buyerId);
    const car = await db.cars.get(h.carId);
    rows.push([buyer?.fullName ?? "?", `${car?.make ?? ""} ${car?.model ?? ""}`, car?.plate ?? "", h.sellingPrice, h.startDate]);
  }
  return { title: "Completed HP Agreements", headers: ["Buyer", "Vehicle", "Plate", "Selling UGX", "Started"], rows };
}

const reports = [
  { name: "Inventory", build: buildInventory },
  { name: "Sales", build: buildSales },
  { name: "Outstanding Balances", build: buildOutstanding },
  { name: "Overdue Payments", build: buildOverdue },
  { name: "Completed HP", build: buildCompleted },
];

function Reports() {
  async function go(format: "pdf" | "xlsx", b: () => Promise<{ title: string; headers: string[]; rows: (string | number)[][] }>) {
    const r = await b();
    if (!r.rows.length) { toast.info("No data for this report"); return; }
    const numericIdx = r.headers.findIndex((h) => h.toLowerCase().includes("ugx") || h.toLowerCase().includes("price") || h.toLowerCase().includes("balance"));
    const displayRows = r.rows.map((row) => row.map((c, i) => (i === numericIdx && typeof c === "number" ? formatUGX(c) : c)));
    if (format === "pdf") exportPDF(r.title, r.headers, displayRows);
    else exportXLSX(r.title, r.headers, displayRows);
  }

  return (
    <AppShell title="Reports">
      <div className="space-y-2">
        {reports.map((r) => (
          <Card key={r.name}>
            <CardContent className="flex items-center justify-between p-4">
              <p className="font-medium">{r.name}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => go("pdf", r.build)}><FileText className="mr-1 h-4 w-4" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => go("xlsx", r.build)}><FileSpreadsheet className="mr-1 h-4 w-4" /> Excel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
