import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { useState } from "react";
import { db, formatUGX, type CarStatus } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/inventory/")({
  head: () => ({ meta: [{ title: "Inventory — Car Bond Manager" }] }),
  component: Inventory,
});

const STATUS_LABEL: Record<CarStatus, string> = {
  in_stock: "In Stock",
  reserved: "Reserved",
  sold_cash: "Sold (Cash)",
  sold_hp: "Sold (HP)",
  sold_completed: "Completed",
};

function Inventory() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CarStatus | "all">("all");
  const cars = useLiveQuery(async () => {
    const all = await db.cars.orderBy("createdAt").reverse().toArray();
    return all.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        c.make.toLowerCase().includes(s) ||
        c.model.toLowerCase().includes(s) ||
        c.plate.toLowerCase().includes(s) ||
        (c.vin ?? "").toLowerCase().includes(s)
      );
    });
  }, [q, filter]);

  return (
    <AppShell title="Inventory">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search make, model, plate, VIN" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/inventory/new"><Plus className="h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(["all", "in_stock", "reserved", "sold_hp", "sold_cash", "sold_completed"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            className="shrink-0"
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {cars?.length === 0 && <Empty msg="No cars yet. Tap + to add one." />}
        {cars?.map((c) => (
          <Link key={c.id} to="/inventory/$id" params={{ id: String(c.id) }}>
            <Card className="hover:border-accent">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">
                    {c.make} {c.model} <span className="text-muted-foreground">({c.year})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.plate} • {c.color}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{formatUGX(c.sellingPrice)}</p>
                </div>
                <StatusBadge status={c.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

export function StatusBadge({ status }: { status: CarStatus }) {
  const tone =
    status === "in_stock"
      ? "bg-primary/10 text-primary"
      : status === "reserved"
        ? "bg-warning/20 text-foreground"
        : status === "sold_hp"
          ? "bg-accent/15 text-accent"
          : "bg-success/15 text-success";
  return <Badge className={`${tone} border-0`}>{STATUS_LABEL[status]}</Badge>;
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}
