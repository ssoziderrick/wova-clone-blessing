import { db, setSetting, getSetting } from "./db";

export async function seedIfEmpty() {
  const seeded = await getSetting("seeded");
  if (seeded === "1") return;
  let carCount = 0;
  try { carCount = await db.cars.count(); } catch { return; }
  if (carCount > 0) {
    await setSetting("seeded", "1");
    return;
  }
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const carIds = (await db.cars.bulkAdd(
    [
      { make: "Toyota", model: "Premio", year: 2012, color: "Pearl White", plate: "UBJ 123A", buyingPrice: 22_000_000, sellingPrice: 28_000_000, datePurchased: today, status: "in_stock", createdAt: now },
      { make: "Toyota", model: "Harrier", year: 2010, color: "Black", plate: "UAX 456B", buyingPrice: 35_000_000, sellingPrice: 45_000_000, datePurchased: today, status: "sold_hp", createdAt: now },
      { make: "Nissan", model: "X-Trail", year: 2011, color: "Silver", plate: "UAQ 789C", buyingPrice: 28_000_000, sellingPrice: 36_000_000, datePurchased: today, status: "in_stock", createdAt: now },
      { make: "Subaru", model: "Forester", year: 2013, color: "Blue", plate: "UBE 234D", buyingPrice: 32_000_000, sellingPrice: 42_000_000, datePurchased: today, status: "sold_hp", createdAt: now },
      { make: "Toyota", model: "Wish", year: 2009, color: "Silver", plate: "UAP 567E", buyingPrice: 18_000_000, sellingPrice: 24_000_000, datePurchased: today, status: "reserved", createdAt: now },
    ],
    { allKeys: true },
  )) as number[];
  const buyerIds = (await db.buyers.bulkAdd(
    [
      { fullName: "John Mukasa", phone: "+256 772 111 222", nin: "CM900...12X", address: "Ntinda, Kampala", occupation: "Trader", createdAt: now },
      { fullName: "Sarah Nakato", phone: "+256 701 333 444", address: "Bukoto, Kampala", occupation: "Teacher", createdAt: now },
    ],
    { allKeys: true },
  )) as number[];
  const start = new Date();
  start.setDate(start.getDate() - 60);
  const startISO = start.toISOString().slice(0, 10);
  const hpIds = (await db.hp.bulkAdd(
    [
      { carId: carIds[1]!, buyerId: buyerIds[0]!, sellingPrice: 45_000_000, deposit: 15_000_000, interest: 10, installmentAmount: 2_500_000, frequency: "monthly", startDate: startISO, numberOfInstallments: 14, status: "active", createdAt: now },
      { carId: carIds[3]!, buyerId: buyerIds[1]!, sellingPrice: 42_000_000, deposit: 10_000_000, interest: 12, installmentAmount: 850_000, frequency: "weekly", startDate: startISO, numberOfInstallments: 44, status: "active", createdAt: now },
    ],
    { allKeys: true },
  )) as number[];
  await db.payments.bulkAdd([
    { hpId: hpIds[0]!, date: today, amount: 2_500_000, method: "mobile_money", reference: "MM-001", createdAt: now },
    { hpId: hpIds[1]!, date: today, amount: 850_000, method: "cash", createdAt: now },
  ]);
  await setSetting("seeded", "1");
}
