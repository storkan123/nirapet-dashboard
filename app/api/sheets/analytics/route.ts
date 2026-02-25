import { NextRequest, NextResponse } from "next/server";
import { getCustomerData } from "@/app/lib/sheets";

export const dynamic = "force-dynamic";

export interface CallAnalytics {
  totalCustomers: number;
  callsAnswered: number;
  answerRate: number;
  avgPurchaseIntent: number;
  interestBreakdown: { hot: number; warm: number; cold: number; not_interested: number };
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  topObjections: { label: string; count: number }[];
  callOutcomes: { interested: number; not_interested: number; needs_more_info: number; no_decision: number };
  rangeLabel: string;
}

function getRangeLabel(range: string, now: Date): string {
  if (range === "all_time") return "All Time";
  if (range === "last_3_months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startLabel = start.toLocaleString("en-US", { month: "short", year: "numeric" });
    const endLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });
    return `${startLabel} – ${endLabel}`;
  }
  return now.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export async function GET(request: NextRequest) {
  try {
    const range = request.nextUrl.searchParams.get("range") ?? "this_month";
    const rows = await getCustomerData();
    const now = new Date();

    // Determine the start date cutoff based on range
    let filteredRows = rows;
    if (range !== "all_time") {
      const monthsBack = range === "last_3_months" ? 2 : 0;
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      filteredRows = rows.filter((row) => {
        const dateStr = row["Date"] || row["call_date"] || "";
        if (!dateStr) return false; // exclude undated rows from ranged views
        try {
          return new Date(dateStr) >= startDate;
        } catch {
          return false;
        }
      });
    }

    const answeredRows = filteredRows.filter(
      (r) => (r["call_status"] || "").toLowerCase() === "answered"
    );

    // Interest breakdown
    const interest = { hot: 0, warm: 0, cold: 0, not_interested: 0 };
    answeredRows.forEach((r) => {
      const v = (r["interest_level"] || "").toLowerCase();
      if (v === "hot") interest.hot++;
      else if (v === "warm") interest.warm++;
      else if (v === "cold") interest.cold++;
      else if (v === "not_interested") interest.not_interested++;
    });

    // Sentiment breakdown
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    answeredRows.forEach((r) => {
      const v = (r["sentiment"] || "").toLowerCase();
      if (v === "positive") sentiment.positive++;
      else if (v === "neutral") sentiment.neutral++;
      else if (v === "negative") sentiment.negative++;
    });

    // Purchase intent average
    const intentScores = answeredRows
      .map((r) => parseFloat(r["purchase_intent_score"] || "0"))
      .filter((n) => n > 0);
    const avgPurchaseIntent =
      intentScores.length > 0
        ? Math.round((intentScores.reduce((a, b) => a + b, 0) / intentScores.length) * 10) / 10
        : 0;

    // Top objections
    const objectionCounts: Record<string, number> = {};
    answeredRows.forEach((r) => {
      const v = r["primary_objection"] || "";
      if (v && v !== "none" && v !== "") {
        const label = v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        objectionCounts[label] = (objectionCounts[label] || 0) + 1;
      }
    });
    const topObjections = Object.entries(objectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    // Call outcomes
    const outcomes = { interested: 0, not_interested: 0, needs_more_info: 0, no_decision: 0 };
    answeredRows.forEach((r) => {
      const v = (r["call_outcome"] || "").toLowerCase();
      if (v === "interested") outcomes.interested++;
      else if (v === "not_interested") outcomes.not_interested++;
      else if (v === "needs_more_info") outcomes.needs_more_info++;
      else if (v === "no_decision") outcomes.no_decision++;
    });

    const analytics: CallAnalytics = {
      totalCustomers: filteredRows.length,
      callsAnswered: answeredRows.length,
      answerRate:
        filteredRows.length > 0
          ? Math.round((answeredRows.length / filteredRows.length) * 100)
          : 0,
      avgPurchaseIntent,
      interestBreakdown: interest,
      sentimentBreakdown: sentiment,
      topObjections,
      callOutcomes: outcomes,
      rangeLabel: getRangeLabel(range, now),
    };

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
