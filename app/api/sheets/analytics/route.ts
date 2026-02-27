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
  // Databox-style chart data
  dailyIntent: { date: string; current: number; previous: number }[];
  dailyHotLeads: { date: string; hotLeads: number; purchases: number }[];
  totalPurchasesPostCall: number;
  interestedPct: number;
  objectionCount: number;
  previousPeriod: {
    totalCustomers: number;
    callsAnswered: number;
    answerRate: number;
    avgPurchaseIntent: number;
    interestedPct: number;
    objectionCount: number;
    totalPurchasesPostCall: number;
  } | null;
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

function getRowDate(row: Record<string, string>): Date | null {
  const dateStr = row["Date"] || row["call_date"] || "";
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeAggregates(rows: Record<string, string>[]) {
  const answered = rows.filter(
    (r) => (r["call_status"] || "").toLowerCase() === "answered"
  );

  const intentScores = answered
    .map((r) => parseFloat(r["purchase_intent_score"] || "0"))
    .filter((n) => n > 0);
  const avgPurchaseIntent =
    intentScores.length > 0
      ? Math.round((intentScores.reduce((a, b) => a + b, 0) / intentScores.length) * 10) / 10
      : 0;

  let interestedCount = 0;
  answered.forEach((r) => {
    if ((r["call_outcome"] || "").toLowerCase() === "interested") interestedCount++;
  });
  const interestedPct =
    answered.length > 0 ? Math.round((interestedCount / answered.length) * 100) : 0;

  let objectionCount = 0;
  answered.forEach((r) => {
    const v = r["primary_objection"] || "";
    if (v && v !== "none" && v !== "") objectionCount++;
  });

  let totalPurchasesPostCall = 0;
  answered.forEach((r) => {
    const v = (r["purchase_post_call"] || "").trim();
    if (!v || v.toLowerCase() === "no" || v.toLowerCase() === "false" || v === "0") return;
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    if (!isNaN(n) && n > 0) totalPurchasesPostCall++;
  });

  return {
    totalCustomers: rows.length,
    callsAnswered: answered.length,
    answerRate:
      rows.length > 0 ? Math.round((answered.length / rows.length) * 100) : 0,
    avgPurchaseIntent,
    interestedPct,
    objectionCount,
    totalPurchasesPostCall,
  };
}

export async function GET(request: NextRequest) {
  try {
    const range = request.nextUrl.searchParams.get("range") ?? "this_month";
    const rows = await getCustomerData();
    const now = new Date();

    // Determine current and previous period date ranges
    let currentStart: Date;
    let prevStart: Date;
    let prevEnd: Date;
    const monthsBack = range === "last_3_months" ? 2 : 0;

    if (range === "all_time") {
      currentStart = new Date(0);
      prevStart = new Date(0);
      prevEnd = new Date(0);
    } else {
      currentStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      const prevMonthsBack = (monthsBack + 1) * 2 - 1;
      prevStart = new Date(now.getFullYear(), now.getMonth() - prevMonthsBack, 1);
      prevEnd = new Date(currentStart.getTime() - 1); // day before current starts
    }

    // Filter rows into current and previous periods
    let filteredRows = rows;
    let prevRows: Record<string, string>[] = [];

    if (range !== "all_time") {
      filteredRows = rows.filter((row) => {
        const d = getRowDate(row);
        return d !== null && d >= currentStart;
      });
      prevRows = rows.filter((row) => {
        const d = getRowDate(row);
        return d !== null && d >= prevStart && d <= prevEnd;
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

    // ── Daily time-series for hero charts ──────────────────────────────────────

    // Group answered rows by date for current period
    const currentByDate: Record<string, Record<string, string>[]> = {};
    answeredRows.forEach((r) => {
      const d = getRowDate(r);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (!currentByDate[key]) currentByDate[key] = [];
      currentByDate[key].push(r);
    });

    // Group answered rows by date for previous period
    const prevAnswered = prevRows.filter(
      (r) => (r["call_status"] || "").toLowerCase() === "answered"
    );
    const prevByDate: Record<string, Record<string, string>[]> = {};
    prevAnswered.forEach((r) => {
      const d = getRowDate(r);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      if (!prevByDate[key]) prevByDate[key] = [];
      prevByDate[key].push(r);
    });

    // Build sorted date keys
    const currentDates = Object.keys(currentByDate).sort();
    const prevDates = Object.keys(prevByDate).sort();

    // Daily Intent: avg purchase_intent_score per day, aligned by day index
    const dailyIntent: CallAnalytics["dailyIntent"] = [];
    const maxDays = Math.max(currentDates.length, prevDates.length);
    for (let i = 0; i < maxDays; i++) {
      const cDate = currentDates[i];
      const pDate = prevDates[i];

      let currentAvg = 0;
      if (cDate && currentByDate[cDate]) {
        const scores = currentByDate[cDate]
          .map((r) => parseFloat(r["purchase_intent_score"] || "0"))
          .filter((n) => n > 0);
        currentAvg = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;
      }

      let prevAvg = 0;
      if (pDate && prevByDate[pDate]) {
        const scores = prevByDate[pDate]
          .map((r) => parseFloat(r["purchase_intent_score"] || "0"))
          .filter((n) => n > 0);
        prevAvg = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;
      }

      const label = cDate
        ? formatDateShort(new Date(cDate + "T00:00:00"))
        : pDate
        ? formatDateShort(new Date(pDate + "T00:00:00"))
        : `Day ${i + 1}`;

      dailyIntent.push({ date: label, current: currentAvg, previous: prevAvg });
    }

    // Daily Hot Leads + Purchases: count per day (current period only)
    const dailyHotLeads: CallAnalytics["dailyHotLeads"] = currentDates.map((dateKey) => {
      const dayRows = currentByDate[dateKey] || [];
      let hotLeads = 0;
      let purchases = 0;
      dayRows.forEach((r) => {
        if ((r["interest_level"] || "").toLowerCase() === "hot") hotLeads++;
        const pv = (r["purchase_post_call"] || "").trim();
        if (pv && pv.toLowerCase() !== "no" && pv.toLowerCase() !== "false" && pv !== "0") {
          const pn = parseFloat(pv.replace(/[^0-9.]/g, ""));
          if (!isNaN(pn) && pn > 0) purchases++;
        }
      });
      return {
        date: formatDateShort(new Date(dateKey + "T00:00:00")),
        hotLeads,
        purchases,
      };
    });

    // Current period derived metrics
    const currentAgg = computeAggregates(filteredRows);

    // Previous period aggregates (null for all_time)
    const previousPeriod = range !== "all_time" ? computeAggregates(prevRows) : null;

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
      dailyIntent,
      dailyHotLeads,
      totalPurchasesPostCall: currentAgg.totalPurchasesPostCall,
      interestedPct: currentAgg.interestedPct,
      objectionCount: currentAgg.objectionCount,
      previousPeriod,
    };

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
