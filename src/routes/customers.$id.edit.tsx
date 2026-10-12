import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, Row } from "./inventory.new";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Buyer — Car Bond Manager" }] }),
  component: EditBuyer,
});

function EditBuyer() {
  const { id } = Route.useParams();
  const buyerId = +id;
  const navigate = useNavigate();
  const [f, setF] = useState<null | { fullName: string; phone: string; email: string; nin: string; address: string; occupation: string; emergencyContact: string }>(null);

  useEffect(() => {
    (async () => {
      const b = await db.buyers.get(buyerId);
      if (!b) { toast.error("Buyer not found"); navigate({ to: "/customers" }); return; }
      setF({
        fullName: b.fullName ?? "", phone: b.phone ?? "", email: b.email ?? "", nin: b.nin ?? "",
        address: b.address ?? "", occupation: b.occupation ?? "", emergencyContact: b.emergencyContact ?? "",
      });
    })();
  }, [buyerId, navigate]);

  if (!f) return <AppShell title="Loading…"><div /></AppShell>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    if (!f.fullName || !f.phone) { toast.error("Name and phone are required"); return; }
    await db.buyers.update(buyerId, f);
    toast.success("Buyer updated");
    navigate({ to: "/customers/$id", params: { id } });
  }

  return (
    <AppShell title="Edit Buyer">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Full Name"><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Row>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="NIN"><Input value={f.nin} onChange={(e) => setF({ ...f, nin: e.target.value })} /></Field>
        </Row>
        <Field label="Email (for portal magic link)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Row>
          <Field label="Occupation"><Input value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} /></Field>
          <Field label="Emergency Contact"><Input value={f.emergencyContact} onChange={(e) => setF({ ...f, emergencyContact: e.target.value })} /></Field>
        </Row>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/customers/$id", params: { id } })}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
        </div>
      </form>
    </AppShell>
  );
}
