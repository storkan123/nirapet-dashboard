"use client";

import { useCallback, useEffect, useState } from "react";
import SheetTable from "@/app/components/SheetTable";
import InsightsReport, { InsightsData } from "@/app/components/InsightsReport";
import { SheetRow } from "@/app/lib/sheets";

const REFRESH_INTERVAL = 30_000; // 30 seconds

const customerColumns = [
  { key: "Name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "Purchases", label: "Purchases" },
  { key: "call_status", label: "Call Status" },
  { key: "transcript", label: "Transcript", expandable: true },
  { key: "objection_detail", label: "Objection Detail", expandable: true },
  { key: "customer_persona", label: "Customer Persona", expandable: true },
];

const contentColumns = [
  { key: "Product", label: "Product" },
  { key: "SEO-Optimized Title", label: "SEO Title", width: "250px" },
  { key: "Focus Keyword", label: "Keyword" },
  { key: "Status", label: "Status" },
];

const callStatusColors: Record<string, string> = {
  answered: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  "no-answer": "bg-yellow-50 text-yellow-700",
  busy: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-700",
  do_not_call: "bg-gray-100 text-gray-500",
};

const contentStatusColors: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  incomplete: "bg-yellow-50 text-yellow-700",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthLabel(row: SheetRow): string {
  const dateStr = row["call_date"] || row["Date"] || "";
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonthSortKey(label: string): number {
  const parts = label.split(" ");
  if (parts.length < 2) return 0;
  const month = MONTH_NAMES.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  if (month < 0 || isNaN(year)) return 0;
  return year * 100 + month;
}

function groupByMonth(rows: SheetRow[]): { label: string; rows: SheetRow[] }[] {
  const map = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const label = getMonthLabel(row);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(row);
  }
  return Array.from(map.entries())
    .map(([label, rows]) => ({ label, rows }))
    .sort((a, b) => {
      if (a.label === "Unknown") return 1;
      if (b.label === "Unknown") return -1;
      return getMonthSortKey(b.label) - getMonthSortKey(a.label);
    });
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<"insights" | "customers" | "content">(
    "insights"
  );

  // Consumer Insights state (fetched independently, always refreshed)
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  // Sheet data state
  const [customers, setCustomers] = useState<SheetRow[]>([]);
  const [content, setContent] = useState<SheetRow[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  // --- Insights fetch ---
  const loadInsights = useCallback(async (isInitial = false) => {
    if (isInitial) setInsightsLoading(true);
    try {
      const res = await fetch("/api/docs");
      const json = await res.json();
      if (json.success) {
        setInsights({ month: json.month, sections: json.sections });
      }
    } catch {
      // silently ignore refresh errors; keep showing last data
    } finally {
      if (isInitial) setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights(true);
    const interval = setInterval(() => loadInsights(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadInsights]);

  // --- Sheet data fetch (on-demand per active tab) ---
  const loadSheet = useCallback(async (isInitial = false) => {
    if (activeTab === "insights") return;
    if (isInitial) {
      setSheetLoading(true);
      setSheetError(null);
    }
    try {
      const res = await fetch(`/api/sheets?sheet=${activeTab}`);
      const json = await res.json();
      if (json.success) {
        if (activeTab === "customers") setCustomers(json.data);
        else setContent(json.data);
        setSheetError(null);
      } else {
        setSheetError(json.error);
      }
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (isInitial) setSheetLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadSheet(true);
    const interval = setInterval(() => loadSheet(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadSheet]);

  // Auto-open current month when customers load
  useEffect(() => {
    if (customers.length > 0) {
      setOpenMonths((prev) => {
        const next = new Set(prev);
        next.add(currentMonthLabel());
        return next;
      });
    }
  }, [customers.length]);

  function toggleMonth(label: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const groups = groupByMonth(customers);
  const thisMonth = currentMonthLabel();

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data</h1>
          <p className="text-gray-500 mt-1">
            Live data from your Google Sheets
          </p>
        </div>
        <p className="text-xs text-gray-400">Auto-refreshes every 30s</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("insights")}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "insights"
                ? "text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Consumer Insights
            {insights && insights.sections.length > 0 && (
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {insights.month || "Report"}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "customers"
                ? "text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Customers & Calls
            {customers.length > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {customers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("content")}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "content"
                ? "text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Content Calendar
            {content.length > 0 && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {content.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab panels */}
        {activeTab === "insights" ? (
          <InsightsReport data={insights} loading={insightsLoading} />
        ) : (
          <div className="p-4">
            {sheetLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-500">Loading data...</p>
                </div>
              </div>
            ) : sheetError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700 font-medium">Failed to load data</p>
                <p className="text-red-500 text-sm mt-1">{sheetError}</p>
              </div>
            ) : activeTab === "customers" ? (
              groups.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg mb-1">No data available</p>
                  <p className="text-sm">
                    Google Sheets credentials may not be configured.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {groups.map(({ label, rows }) => {
                    const isCurrentMonth = label === thisMonth;
                    const isOpen = openMonths.has(label);
                    return (
                      <div
                        key={label}
                        className={`rounded-xl border overflow-hidden ${
                          isCurrentMonth
                            ? "border-emerald-200"
                            : "border-gray-200"
                        }`}
                      >
                        {/* Month header */}
                        <button
                          onClick={() => toggleMonth(label)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            isCurrentMonth
                              ? "bg-emerald-50 hover:bg-emerald-100/70"
                              : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block transition-transform text-xs ${
                                isOpen ? "rotate-90" : ""
                              } ${
                                isCurrentMonth
                                  ? "text-emerald-600"
                                  : "text-gray-400"
                              }`}
                            >
                              ▶
                            </span>
                            <span
                              className={`font-semibold text-sm ${
                                isCurrentMonth
                                  ? "text-emerald-700"
                                  : "text-gray-600"
                              }`}
                            >
                              {label}
                            </span>
                            {isCurrentMonth && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {rows.length} record{rows.length !== 1 ? "s" : ""}
                          </span>
                        </button>

                        {/* Rows */}
                        {isOpen && (
                          <div className="border-t border-gray-100">
                            <SheetTable
                              data={rows}
                              columns={customerColumns}
                              statusKey="call_status"
                              statusColors={callStatusColors}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <SheetTable
                data={content}
                columns={contentColumns}
                statusKey="Status"
                statusColors={contentStatusColors}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
