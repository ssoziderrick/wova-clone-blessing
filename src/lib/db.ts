// Types + business helpers. The `db` instance is Cloud-backed and shared across
// every signed-in device via Realtime — the API mirrors the small Dexie surface
// the app already uses so screens don't need to change.
export type CarStatus = "in_stock" | "reserved" | "sold_cash" | "sold_hp" | "sold_completed";
export type HpStatus = "active" | "completed" | "defaulted" | "overdue";
export type Frequency = "weekly" | "biweekly" | "monthly";
export type PaymentMethod = "cash" | "bank" | "mobile_money";

export interface Car {
  id?: number;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  vin?: string;
  engineNumber?: string;
  buyingPrice: number;
  sellingPrice: number;
  datePurchased: string;
  dateSold?: string;
  status: CarStatus;
  photos?: string[];
  notes?: string;
  createdAt: string;
}

export interface Buyer {
  id?: number;
  fullName: string;
  phone: string;
  nin?: string;
  address?: string;
  occupation?: string;
  emergencyContact?: string;
  photo?: string;
  createdAt: string;
}

export interface HirePurchase {
  id?: number;
  carId: number;
  buyerId: number;
  sellingPrice: number;
  deposit: number;
  interest: number;
  installmentAmount: number;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  numberOfInstallments: number;
  status: HpStatus;
  createdAt: string;
}

export interface Payment {
  id?: number;
  hpId: number;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export { db, getSetting, setSetting, useLiveQuery } from "./cloud-db";

import { db } from "./cloud-db";

export function addInterval(dateISO: string, freq: Frequency, count = 1): string {
  const d = new Date(dateISO);
  if (freq === "weekly") d.setDate(d.getDate() + 7 * count);
  else if (freq === "biweekly") d.setDate(d.getDate() + 14 * count);
  else d.setMonth(d.getMonth() + count);
  return d.toISOString().slice(0, 10);
}

export async function hpSummary(hpId: number) {
  const hp = (await db.hp.get(hpId)) as HirePurchase | undefined;
  if (!hp) return null;
  const payments = (await db.payments.where("hpId").equals(hpId).toArray()) as Payment[];
  const totalDue = hp.sellingPrice + (hp.sellingPrice * hp.interest) / 100;
  const paid = hp.deposit + payments.reduce((a, p) => a + p.amount, 0);
  const balance = Math.max(0, totalDue - paid);
  const percent = totalDue > 0 ? Math.min(100, (paid / totalDue) * 100) : 0;

  const sorted = payments.slice().sort((a, b) => a.date.localeCompare(b.date));
  const lastDate = sorted.length ? sorted[sorted.length - 1].date : hp.startDate;
  const nextDue = addInterval(lastDate, "monthly", 1);
  const installmentsPaid = Math.floor((paid - hp.deposit) / Math.max(1, hp.installmentAmount));
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = balance > 0 && nextDue < today;

  return { hp, payments, totalDue, paid, balance, percent, nextDue, isOverdue, installmentsPaid };
}

export function formatUGX(n: number): string {
  return "UGX " + Math.round(n).toLocaleString("en-UG");
}
