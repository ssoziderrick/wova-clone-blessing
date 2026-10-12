import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().min(4).max(32),
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("256")) return `+${digits}`;
  if (digits.startsWith("0")) return `+256${digits.slice(1)}`;
  if (String(raw).trim().startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export const Route = createFileRoute("/api/public/accept-invite")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = BodySchema.safeParse(payload);
        if (!parsed.success) {
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        const { token, password } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look up the invite (bypasses RLS via admin)
        const { data: invite, error: iErr } = await supabaseAdmin
          .from("buyer_invites")
          .select("id, buyer_id, user_id, phone, redeemed_at, expires_at")
          .eq("token", token)
          .maybeSingle();
        if (iErr) return json({ error: iErr.message }, 500);
        if (!invite) return json({ error: "Invite not found" }, 404);
        if (invite.redeemed_at) return json({ error: "This invite has already been used" }, 409);
        if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
          return json({ error: "This invite has expired" }, 410);
        }

        // Prefer the invite's phone; fall back to the one supplied by the buyer.
        const phone = normalizePhone(invite.phone ?? parsed.data.phone);
        if (!phone) {
          return json({ error: "A phone number is required to create your account" }, 400);
        }

        // Load buyer for linkage
        const { data: buyer, error: bErr } = await supabaseAdmin
          .from("buyers")
          .select("id, auth_user_id")
          .eq("id", invite.buyer_id)
          .maybeSingle();
        if (bErr || !buyer) return json({ error: bErr?.message ?? "Buyer not found" }, 500);

        // Find or create the auth user (match by phone)
        let authUserId = buyer.auth_user_id as string | null;
        if (!authUserId) {
          for (let page = 1; page <= 10 && !authUserId; page++) {
            const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage: 200,
            });
            if (lErr) return json({ error: lErr.message }, 500);
            const found = list?.users?.find((u) => {
              if (!u.phone) return false;
              return `+${String(u.phone).replace(/\D/g, "")}` === phone;
            });
            if (found) authUserId = found.id;
            if (!list?.users || list.users.length < 200) break;
          }
        }

        if (authUserId) {
          const { error: uErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password,
            phone,
            phone_confirm: true,
          } as never);
          if (uErr) return json({ error: uErr.message }, 500);
        } else {
          const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
            phone,
            password,
            phone_confirm: true,
          } as never);
          if (cErr || !created?.user) return json({ error: cErr?.message ?? "Could not create account" }, 500);
          authUserId = created.user.id;
        }

        // Link buyer -> auth user (uses service_role, bypasses the protect trigger)
        if (buyer.auth_user_id !== authUserId) {
          const { error: linkErr } = await supabaseAdmin
            .from("buyers")
            .update({ auth_user_id: authUserId })
            .eq("id", buyer.id);
          if (linkErr) return json({ error: linkErr.message }, 500);
        }

        // Mark invite redeemed
        await supabaseAdmin
          .from("buyer_invites")
          .update({ redeemed_at: new Date().toISOString(), redeemed_by: authUserId })
          .eq("id", invite.id);

        return json({ ok: true, phone });
      },
    },
  },
});
