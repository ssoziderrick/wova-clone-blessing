import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { useState } from "react";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Phone } from "lucide-react";

export const Route = createFileRoute("/customers/")({
  head: () => ({ meta: [{ title: "Buyers — Car Bond Manager" }] }),
  component: Customers,
});

function Customers() {
  const [q, setQ] = useState("");
  const buyers = useLiveQuery(async () => {
    const all = await db.buyers.toArray();
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter((b) => b.fullName.toLowerCase().includes(s) || b.phone.includes(q) || (b.nin ?? "").toLowerCase().includes(s));
  }, [q]);

  return (
    <AppShell title="Buyers">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, phone, NIN" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/customers/new"><Plus className="h-4 w-4" /></Link>
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {buyers?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No buyers yet.
          </div>
        )}
        {buyers?.map((b) => (
          <Link key={b.id} to="/customers/$id" params={{ id: String(b.id) }}>
            <Card className="hover:border-accent">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{b.fullName}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {b.phone}
                  </p>
                </div>
                {b.occupation && <span className="text-xs text-muted-foreground">{b.occupation}</span>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
