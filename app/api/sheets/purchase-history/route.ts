import { NextResponse } from "next/server";
import { getCustomerData } from "@/app/lib/sheets";

export const dynamic = "force-dynamic";

export interface MonthlyPurchase {
  month: string; // e.g. "Jan 2026"
  total: number;
  count: number;
}

function parsePurchase(val: string): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  try {
    const rows = await getCustomerData();
    const now = new Date();

    // Build last 6 months in order (oldest → newest)
    const months: { key: string; label: string; total: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      months.push({ key, label, total: 0, count: 0 });
    }

    for (const row of rows) {
      const amount = parsePurchase(row["Purchases"] || "");
      if (amount <= 0) continue;

      const dateStr = row["Date"] || row["call_date"] || "";
      if (!dateStr) continue;
      let d: Date;
      try { d = new Date(dateStr); } catch { continue; }
      if (isNaN(d.getTime())) continue;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) {
        bucket.total += amount;
        bucket.count++;
      }
    }

    const data: MonthlyPurchase[] = months.map(({ label, total, count }) => ({
      month: label,
      total: Math.round(total * 100) / 100,
      count,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
