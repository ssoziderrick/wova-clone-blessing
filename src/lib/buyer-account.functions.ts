import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface ProvisionInput {
  buyerId: number;
  email: string;
}

function normalizeEmail(raw: string): string {
  return String(raw).trim().toLowerCase();
}

/**
 * Manager-side: link the buyer's email to a Supabase auth identity and store
 * its UUID on `buyers.auth_user_id`. No password is set here — the buyer
 * creates their own password through the secure invite flow, so the manager
 * never knows it.
 */
export const provisionBuyerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ProvisionInput) => {
    if (!data || typeof data.buyerId !== "number") throw new Error("buyerId required");
    const email = normalizeEmail(data.email ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    return { buyerId: data.buyerId, email };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { buyerId, email } = data;

    // The manager must own this buyer (RLS enforces it).
    const { data: buyer, error: bErr } = await supabase
      .from("buyers")
      .select("id, full_name, phone, email, auth_user_id")
      .eq("id", buyerId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!buyer) throw new Error("Buyer not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find an existing auth user with this email, otherwise create a password-less one.
    // The buyer will set the password themselves via the invite link.
    let authUserId = buyer.auth_user_id as string | null;
    if (!authUserId) {
      const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (lErr) throw new Error(lErr.message);
      const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (existing) {
        authUserId = existing.id;
      } else {
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: buyer.full_name, role: "buyer" },
        });
        if (cErr || !created.user) throw new Error(cErr?.message ?? "Could not create the account");
        authUserId = created.user.id;
      }
    }

    // Link the identity to the buyer record + keep the email in sync.
    const { error: linkErr } = await supabaseAdmin
      .from("buyers")
      .update({ auth_user_id: authUserId, email })
      .eq("id", buyerId);
    if (linkErr) throw new Error(linkErr.message);

    // Buyer profile (role-based access control lives here).
    const { error: pErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: authUserId,
        email,
        full_name: buyer.full_name,
        role: "buyer",
        buyer_id: buyerId,
      },
      { onConflict: "id" },
    );
    if (pErr) throw new Error(pErr.message);

    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      owner_id: userId,
      buyer_id: buyerId,
      action: "buyer_account_linked",
      description: `Portal account ${email} linked to ${buyer.full_name}`,
    });

    return { email, authUserId, alreadyLinked: buyer.auth_user_id === authUserId };
  });

/** Ensures the signed-in manager has a manager profile row. Safe to call often. */
export const ensureManagerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : null;
    const { error } = await supabase.from("profiles").upsert(
      { id: userId, email, role: "manager" },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
