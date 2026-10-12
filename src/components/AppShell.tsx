import { useEffect, type ReactNode } from "react";
import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Car, Users, Wallet, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import logo from "@/assets/wova-rich-logo.jpeg.asset.json";
import { ensureManagerProfile } from "@/lib/buyer-account.functions";

const tabs = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Car },
  { to: "/customers", label: "Buyers", icon: Users },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children, title, showBack = true }: { children: ReactNode; title?: string; showBack?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const canGoBack = pathname !== "/" && showBack;

  // Keep the signed-in manager's shared-backend profile row present (role: manager).
  useEffect(() => {
    ensureManagerProfile().catch(() => { /* non-fatal */ });
  }, []);


  return (
    <div className="relative z-10 flex min-h-screen justify-center">
      <div className="relative flex min-h-screen w-full flex-col pb-24">
        {title && (
          <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
            <div className="glass-panel mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
              {canGoBack && (
                <button
                  type="button"
                  onClick={() => router.history.back()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-primary blur-md opacity-70 animate-breath" />
                <img src={logo.url} alt="Wova Rich" className="relative h-11 w-11 rounded-full object-cover ring-1 ring-white/30" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">{title}</h1>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Wova Rich · Kampala</p>
              </div>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald shadow-[0_0_10px_var(--emerald)]" />
            </div>
          </header>
        )}

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6">{children}</main>

        <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2">
          <div className="glass-panel grid grid-cols-5 px-2 py-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="group relative flex flex-col items-center gap-1 py-1 text-[10px]"
                >
                  <span
                    className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-tile scale-110 -translate-y-1"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {active && <span className="absolute -inset-1 rounded-2xl bg-gradient-primary opacity-40 blur-md" />}
                    <Icon className="relative h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 1.8} />
                  </span>
                  <span className={`uppercase tracking-wider ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {t.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

