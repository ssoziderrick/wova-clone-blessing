// Single guarded registration wrapper for the app service worker.
// Never registers in dev, in an iframe, or in Lovable preview hosts.

const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;

  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;

  return false;
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes(SW_URL))
      .map((r) => r.unregister()),
  );
}

export async function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    await unregisterAppServiceWorkers();
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    // Pick up new deployments without a manual reinstall.
    reg.addEventListener("updatefound", () => reg.update());
    setInterval(() => reg.update(), 60 * 60 * 1000);
  } catch {
    // Registration failures must never break the app.
  }
}
