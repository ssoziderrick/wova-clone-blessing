import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { db, formatUGX, hpSummary, getSetting } from "@/lib/db";
import { createBuyerInvite } from "@/lib/buyer-invite.functions";
import { BuyerPortalAccount } from "@/components/BuyerPortalAccount";


import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_BUYER_PORTAL_URL = "https://carbuyer-hub.lovable.app";

export const Route = createFileRoute("/customers/$id/")({
  head: () => ({ meta: [{ title: "Buyer — Car Bond Manager" }] }),
  component: BuyerDetail,
});


function BuyerDetail() {
  const { id } = Route.useParams();
  const buyerId = +id;
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    const buyer = await db.buyers.get(buyerId);
    if (!buyer) return null;
    const hps = await db.hp.where("buyerId").equals(buyerId).toArray();
    const list = await Promise.all(
      hps.map(async (h) => {
        const car = await db.cars.get(h.carId);
        const summary = await hpSummary(h.id!);
        return { hp: h, car, summary };
      }),
    );
    return { buyer, list };
  }, [buyerId]);

  if (!data) return <AppShell title="Loading…"><div /></AppShell>;
  const { buyer, list } = data;

  async function remove() {
    await db.buyers.delete(buyerId);
    toast.success("Buyer deleted");
    navigate({ to: "/customers" });
  }

  async function sendInvite(viaWhatsApp: boolean) {
    const portalUrl = (((await getSetting("buyerPortalUrl")) ?? "").trim() || DEFAULT_BUYER_PORTAL_URL);
    if (!portalUrl || !/^https?:\/\//i.test(portalUrl)) {
      toast.error("Set the Buyer Portal URL in Settings first (must start with https://)");
      return;
    }
    let link: string;
    try {
      const res = await createBuyerInvite({ data: { buyerId, portalUrl } });
      link = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invite");
      return;
    }
    if (viaWhatsApp) {
      if (!buyer.phone) { toast.error("No phone on file"); return; }
      const clean = buyer.phone.replace(/\D/g, "").replace(/^0/, "256");
      const msg = `Hello ${buyer.fullName}, tap this link to set up your Wova Rich Investments account. You'll create a password once, then sign in normally after that: ${link}`;
      const whatsappUrl = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
      try { await navigator.clipboard.writeText(msg); } catch { /* noop */ }
      const win = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked (common in Lovable preview iframe) — navigate directly.
        window.location.href = whatsappUrl;
      }
      toast.success("WhatsApp opened. Message also copied to clipboard.");
    } else {
      await navigator.clipboard.writeText(link);
      toast.success("Tap-to-open link copied");
    }
  }




  return (
    <AppShell title={buyer.fullName}>
      <Card>
        <CardContent className="space-y-1 p-4 text-sm">
          <Line label="Phone" value={buyer.phone} />
          {buyer.nin && <Line label="NIN" value={buyer.nin} />}
          {buyer.address && <Line label="Address" value={buyer.address} />}
          {buyer.occupation && <Line label="Occupation" value={buyer.occupation} />}
          {buyer.emergencyContact && <Line label="Emergency" value={buyer.emergencyContact} />}
        </CardContent>
      </Card>

      <h2 className="mb-2 mt-4 text-sm font-semibold text-muted-foreground">Vehicles ({list.length})</h2>
      <div className="space-y-2">
        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No vehicles yet.
          </div>
        )}
        {list.map(({ hp, car, summary }) =>
          car && summary ? (
            <Link key={hp.id} to="/inventory/$id" params={{ id: String(car.id) }}>
              <Card className="hover:border-accent">
                <CardContent className="p-4">
                  <p className="font-semibold">{car.make} {car.model} • {car.plate}</p>
                  <p className="text-xs text-muted-foreground">Balance {formatUGX(summary.balance)} • Next {summary.nextDue}</p>
                </CardContent>
              </Card>
            </Link>
          ) : null,
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => sendInvite(true)}>
          <MessageCircle className="mr-1 h-4 w-4" /> Invite via WhatsApp
        </Button>
        <Button variant="outline" onClick={() => sendInvite(false)}>
          <Send className="mr-1 h-4 w-4" /> Copy invite link
        </Button>
      </div>

      <Button asChild variant="outline" className="mt-2 w-full">
        <Link to="/customers/$id/edit" params={{ id: String(buyerId) }}>Edit Buyer</Link>
      </Button>

      <BuyerPortalAccount buyerId={buyerId} buyerName={buyer.fullName} buyerEmail={(buyer as { email?: string | null }).email ?? null} />




      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-4 w-full">Delete Buyer</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this buyer?</AlertDialogTitle>
            <AlertDialogDescription>Their vehicles and HP records remain.</AlertDialogDescription>
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

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
