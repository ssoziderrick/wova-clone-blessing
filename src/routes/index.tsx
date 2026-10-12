import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@/lib/db";
import { db, formatUGX, hpSummary } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Car, Users, Wallet, AlertTriangle, TrendingUp, CalendarClock, Plus, FileDown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Car Bond Manager" },
      { name: "description", content: "Overview of inventory, sales and hire purchase status." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useLiveQuery(async () => {
    const cars = await db.cars.toArray();
    const hps = await db.hp.toArray();
    const summaries = await Promise.all(hps.map((h) => hpSummary(h.id!)));
    const inStock = cars.filter((c) => c.status === "in_stock").length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const soldThisMonth = cars.filter(
      (c) => (c.status === "sold_cash" || c.status === "sold_hp" || c.status === "sold_completed") && c.createdAt.slice(0, 10) >= monthStart,
    ).length;
    const soldHp = cars.filter((c) => c.status === "sold_hp").length;
    const outstanding = summaries.reduce((a, s) => a + (s?.balance ?? 0), 0);
    const today = now.toISOString().slice(0, 10);
    const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
    const in7iso = in7.toISOString().slice(0, 10);
    const overdue = summaries.filter((s) => s && s.isOverdue).length;
    const dueToday = summaries.filter((s) => s && !s.isOverdue && s.nextDue === today).length;
    const upcoming = summaries.filter((s) => s && !s.isOverdue && s.nextDue > today && s.nextDue <= in7iso).length;
    return { inStock, soldThisMonth, soldHp, outstanding, overdue, dueToday, upcoming };
  }, []);

  return (
    <AppShell title="Car Bond Manager">
      <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Car />}          label="Cars in Stock"  value={stats?.inStock ?? 0}        tone="teal"     to="/inventory" />
        <StatCard icon={<TrendingUp />}   label="Cars sold" value={stats?.soldThisMonth ?? 0} tone="emerald"  to="/inventory" />
        <StatCard icon={<Wallet />}       label="On Hire Purchase" value={stats?.soldHp ?? 0}       tone="neon"     to="/payments" />
        <StatCard icon={<AlertTriangle/>} label="Overdue" value={stats?.overdue ?? 0} tone="coral" to="/payments" pulse={(stats?.overdue ?? 0) > 0} />

      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={<CalendarClock />} label="Due today" value={stats?.dueToday ?? 0} accent="amber" to="/payments" />
        <MiniStat icon={<CalendarClock />} label="Next 7 days" value={stats?.upcoming ?? 0} accent="teal" to="/payments" />
      </div>

      <h2 className="mt-6 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/inventory/new" icon={<Plus />} label="Add Car" tone="teal" />
        <QuickAction to="/customers/new" icon={<Users />} label="Add Buyer" tone="electric" />
        <QuickAction to="/payments/new" icon={<Wallet />} label="Record Payment" tone="emerald" />
        <QuickAction to="/reports" icon={<FileDown />} label="Reports" tone="neon" />
      </div>

      {/* Discreet outstanding total — below quick actions, monospace + subdued */}
      <Link to="/payments" className="glass-panel mt-4 flex items-center justify-between px-4 py-3 hover:bg-white/5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_var(--teal)]" />
          Total HP Outstanding
        </div>
        <span className="font-mono-num text-sm font-semibold text-foreground/80">{formatUGX(stats?.outstanding ?? 0)}</span>
      </Link>
    </AppShell>
  );
}


const toneMap = {
  teal:     { grad: "bg-gradient-teal",    color: "var(--teal)" },
  electric: { grad: "bg-gradient-primary", color: "var(--electric)" },
  emerald:  { grad: "bg-gradient-success", color: "var(--emerald)" },
  neon:     { grad: "bg-gradient-accent",  color: "var(--neon)" },
  coral:    { grad: "bg-gradient-warning", color: "var(--coral)" },
  amber:    { grad: "bg-gradient-warning", color: "var(--amber)" },
} as const;

function StatCard({ icon, label, value, tone, to, pulse }: { icon: React.ReactNode; label: string; value: number; tone: keyof typeof toneMap; to?: string; pulse?: boolean }) {
  const t = toneMap[tone];
  const content = (
    <>
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-25 blur-2xl bg-white" />
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-primary-foreground shadow-inner backdrop-blur-sm [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-white/80">{label}</p>
      <p className="font-mono-num mt-1 text-3xl font-bold text-white">{value}</p>
    </>
  );
  const className = `group relative block overflow-hidden rounded-xl p-4 ${t.grad} text-primary-foreground shadow-tile transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] ${pulse ? "animate-warning-pulse" : ""}`;
  if (to) return <Link to={to} className={className}>{content}</Link>;
  return <div className={className}>{content}</div>;
}


function MiniStat({ icon, label, value, accent, to }: { icon: React.ReactNode; label: string; value: number; accent: keyof typeof toneMap; to?: string }) {
  const t = toneMap[accent];
  const content = (
    <>
      <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-20 blur-xl bg-white" />
      <div className="flex items-center gap-2 text-white/80">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-mono-num mt-1 text-2xl font-bold text-white">{value}</p>
    </>
  );
  const className = `relative block overflow-hidden rounded-xl p-4 ${t.grad} text-primary-foreground shadow-tile transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]`;
  if (to) return <Link to={to} className={className}>{content}</Link>;
  return <div className={className}>{content}</div>;
}

function QuickAction({ to, icon, label, tone }: { to: string; icon: React.ReactNode; label: string; tone: keyof typeof toneMap }) {
  const t = toneMap[tone];
  return (
    <Link
      to={to}
      className="glass-panel btn-tactile active:btn-tactile-press group relative flex items-center gap-3 overflow-hidden p-3"
    >
      <span className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${t.grad} text-primary-foreground shadow-tile [&>svg]:h-4 [&>svg]:w-4`}>
        <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-60" style={{ boxShadow: `0 0 20px ${t.color}` }} />
        {icon}
      </span>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </Link>
  );
}
