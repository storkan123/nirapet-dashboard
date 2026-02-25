import { NextResponse } from "next/server";
import { getCustomerData } from "@/app/lib/sheets";

export const dynamic = "force-dynamic";

export interface PurchaseStats {
  thisMonth: number;
  last3Months: number;
  allTime: number;
  thisMonthCount: number;
  last3MonthsCount: number;
  allTimeCount: number;
}

function parsePurchase(val: string): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export async function GET() {
  try {
    const rows = await getCustomerData();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    let allTime = 0, allTimeCount = 0;
    let last3Months = 0, last3MonthsCount = 0;
    let thisMonth = 0, thisMonthCount = 0;

    for (const row of rows) {
      const amount = parsePurchase(row["Purchases"] || "");
      if (amount <= 0) continue;

      allTime += amount;
      allTimeCount++;

      const dateStr = row["Date"] || row["call_date"] || "";
      if (!dateStr) continue;
      let d: Date;
      try { d = new Date(dateStr); } catch { continue; }

      if (d >= threeMonthStart) {
        last3Months += amount;
        last3MonthsCount++;
      }
      if (d >= monthStart) {
        thisMonth += amount;
        thisMonthCount++;
      }
    }

    const stats: PurchaseStats = {
      thisMonth: Math.round(thisMonth * 100) / 100,
      last3Months: Math.round(last3Months * 100) / 100,
      allTime: Math.round(allTime * 100) / 100,
      thisMonthCount,
      last3MonthsCount,
      allTimeCount,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
