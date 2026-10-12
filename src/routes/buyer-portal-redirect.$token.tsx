import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const DEFAULT_BUYER_PORTAL_URL = "https://carbuyer-hub.lovable.app";

export const Route = createFileRoute("/buyer-portal-redirect/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Opening Buyer Portal — Car Bond Manager" }] }),
  component: BuyerPortalRedirect,
});

function safePortalUrl(raw: string | null): string {
  if (!raw) return DEFAULT_BUYER_PORTAL_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return DEFAULT_BUYER_PORTAL_URL;
    return url.origin;
  } catch {
    return DEFAULT_BUYER_PORTAL_URL;
  }
}

function BuyerPortalRedirect() {
  const [message, setMessage] = useState("Opening Buyer Portal…");

  useEffect(() => {
    let cancelled = false;
    const portal = safePortalUrl(new URLSearchParams(window.location.search).get("portal"));

    function forward(session: {
      access_token: string;
      refresh_token: string;
      expires_in?: number | null;
      token_type?: string | null;
    }) {
      const hash = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: String(session.expires_in ?? 3600),
        token_type: session.token_type ?? "bearer",
        type: "magiclink",
      });
      window.location.replace(`${portal}/dashboard#${hash.toString()}`);
    }

    // Listen for supabase-js to finish processing the URL hash.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled || !session) return;
      cancelled = true;
      sub.subscription.unsubscribe();
      forward(session);
    });

    // Poll for up to ~10s in case the session is already set.
    (async () => {
      for (let i = 0; i < 20; i++) {
        if (cancelled) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          cancelled = true;
          sub.subscription.unsubscribe();
          forward(data.session);
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!cancelled) {
        setMessage("This invite link could not be verified. Please ask the manager to send a fresh link.");
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">{message}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep this page open for a moment while your private account is prepared.
        </p>
      </div>
    </div>
  );
}