// Cloud-backed data layer that mirrors the small Dexie surface the app uses,
// so screens can stay unchanged. Realtime keeps every signed-in device in sync.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = "cars" | "buyers" | "hp" | "payments";
const TABLES: TableName[] = ["cars", "buyers", "hp", "payments"];

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const NUMERIC_FIELDS = new Set([
  "buyingPrice", "sellingPrice", "deposit", "interest",
  "installmentAmount", "amount", "year", "numberOfInstallments",
]);

function rowIn(rec: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(rec)) {
    const v = rec[k];
    if (v === undefined) continue;
    o[toSnake(k)] = v;
  }
  return o;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowOut(rec: any): any {
  if (!rec) return rec;
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(rec)) {
    const camelKey = toCamel(k);
    let v: unknown = rec[k];
    if (NUMERIC_FIELDS.has(camelKey) && typeof v === "string" && v !== "") v = Number(v);
    o[camelKey] = v;
  }
  return o;
}

// --- change bus fed by realtime ---
const subs = new Set<() => void>();
function fireAll() { subs.forEach((cb) => cb()); }

let realtimeStarted = false;
function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  const ch = supabase.channel("app-sync");
  for (const t of [...TABLES, "settings"] as const) {
    ch.on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: t } as never,
      () => fireAll(),
    );
  }
  ch.subscribe();
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (): any => supabase.from(name);

  const build = () => {
    let filterField: string | null = null;
    let filterOp: "eq" | "in" | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filterVal: any = null;
    let order: { field: string; asc: boolean } | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFilter = (q: any): any => {
      if (filterField && filterOp === "eq") q = q.eq(toSnake(filterField), filterVal);
      else if (filterField && filterOp === "in") q = q.in(toSnake(filterField), filterVal);
      if (order) q = q.order(toSnake(order.field), { ascending: order.asc });
      return q;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      async toArray() {
        const q = applyFilter(base().select("*"));
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map(rowOut);
      },
      async first() {
        const arr = await chain.toArray();
        return arr[0];
      },
      async delete() {
        const q = applyFilter(base().delete());
        const { error } = await q;
        if (error) throw error;
      },
      where(field: string) {
        filterField = field;
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          equals(v: any) { filterOp = "eq"; filterVal = v; return chain; },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          anyOf(...vals: any[]) {
            filterOp = "in";
            filterVal = vals.length === 1 && Array.isArray(vals[0]) ? vals[0] : vals;
            return chain;
          },
        };
      },
      orderBy(field: string) {
        order = { field, asc: true };
        return {
          reverse() { order!.asc = false; return { toArray: chain.toArray }; },
          toArray: chain.toArray,
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter(fn: (r: any) => boolean) {
        return { async toArray() { return (await chain.toArray()).filter(fn); } };
      },
    };
    return chain;
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  type Chain = {
    toArray(): Promise<any[]>;
    first(): Promise<any>;
    delete(): Promise<void>;
    where(field: string): Where;
  };
  type Where = { equals(v: any): Chain; anyOf(...vals: any[]): Chain };
  type Order = { reverse(): { toArray(): Promise<any[]> }; toArray(): Promise<any[]> };

  return {
    async toArray(): Promise<any[]> { return build().toArray(); },
    async first(): Promise<any> { return build().first(); },
    where(field: string): Where { return build().where(field) as Where; },
    orderBy(field: string): Order { return build().orderBy(field) as Order; },
    filter(fn: (r: any) => boolean): { toArray(): Promise<any[]> } {
      return build().filter(fn) as { toArray(): Promise<any[]> };
    },
    async count(): Promise<number> {
      const { count, error } = await base().select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    async get(id: number): Promise<any | undefined> {
      const { data, error } = await base().select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return rowOut(data) ?? undefined;
    },
    async add(rec: Record<string, unknown>): Promise<number> {
      const uid = await currentUserId();
      const { data, error } = await base()
        .insert({ ...rowIn(rec), user_id: uid })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: number }).id;
    },
    async bulkAdd(list: Record<string, unknown>[], opts?: { allKeys?: boolean }): Promise<any> {
      const uid = await currentUserId();
      const rows = list.map((r) => ({ ...rowIn(r), user_id: uid }));
      const { data, error } = await base().insert(rows).select("id");
      if (error) throw error;
      const ids = ((data ?? []) as { id: number }[]).map((r) => r.id);
      return opts?.allKeys ? ids : ids[ids.length - 1];
    },
    async update(id: number, patch: Record<string, unknown>): Promise<void> {
      const { error } = await base().update(rowIn(patch)).eq("id", id);
      if (error) throw error;
    },
    async delete(id: number): Promise<void> {
      const { error } = await base().delete().eq("id", id);
      if (error) throw error;
    },
    async clear(): Promise<void> {
      const uid = await currentUserId();
      if (!uid) return;
      const { error } = await base().delete().eq("user_id", uid);
      if (error) throw error;
    },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const db = {
  cars: table("cars"),
  buyers: table("buyers"),
  hp: table("hp"),
  payments: table("payments"),
  async transaction(_mode: string, ..._args: unknown[]): Promise<unknown> {
    const cb = _args[_args.length - 1] as () => unknown | Promise<unknown>;
    return await cb();
  },
};

export async function getSetting(key: string): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("user_id", uid)
    .eq("key", key)
    .maybeSingle();
  return (data as { value: string } | null)?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from("settings").upsert({ user_id: uid, key, value });
}

// Drop-in replacement for dexie-react-hooks' useLiveQuery. Reruns whenever any
// synced table changes (via Realtime) or the deps change.
export function useLiveQuery<T>(fn: () => Promise<T> | T, deps: unknown[] = []): T | undefined {
  const [state, setState] = useState<T | undefined>(undefined);
  useEffect(() => {
    ensureRealtime();
    let alive = true;
    let running = false;
    let queued = false;
    const run = async () => {
      if (running) { queued = true; return; }
      running = true;
      try {
        const v = await fn();
        if (alive) setState(v);
      } catch (e) {
        console.error("useLiveQuery error", e);
      } finally {
        running = false;
        if (queued) { queued = false; run(); }
      }
    };
    run();
    const cb = () => run();
    subs.add(cb);
    return () => { alive = false; subs.delete(cb); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
