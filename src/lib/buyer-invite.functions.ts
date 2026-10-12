import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface Input {
  buyerId: number;
  portalUrl: string;
}

// Manager-side: create (or reuse) an invite token for a buyer and return a
// link to the Buyer Portal's Accept Invite page, where the buyer sets a
// password once. After that they sign in with email + password normally.
export const createBuyerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data || typeof data.buyerId !== "number") throw new Error("buyerId required");
    if (!data.portalUrl || !/^https?:\/\//i.test(data.portalUrl)) {
      throw new Error("Set the Buyer Portal URL in Settings first (must start with https://)");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { buyerId, portalUrl } = data;
    const { supabase, userId } = context;

    const { data: buyer, error: bErr } = await supabase
      .from("buyers")
      .select("id, full_name, phone, email")
      .eq("id", buyerId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!buyer) throw new Error("Buyer not found");
    if (!buyer.phone && !buyer.email) {
      throw new Error("Add a phone number (or email) to this buyer first (Edit Buyer).");
    }

    const email = buyer.email ? String(buyer.email).trim().toLowerCase() : null;

    const { data: inv, error: iErr } = await supabase
      .from("buyer_invites")
      .insert({ buyer_id: buyerId, user_id: userId, email, phone: buyer.phone })
      .select("token")
      .single();
    if (iErr || !inv) throw new Error(iErr?.message ?? "Failed to create invite");

    const portalBase = portalUrl.replace(/\/$/, "");
    const url = `${portalBase}/accept-invite/${inv.token}`;
    return { url, phone: buyer.phone as string | null, name: buyer.full_name as string, email };
  });
