"use client";

import { useCallback, useEffect, useState } from "react";
import SheetTable from "@/app/components/SheetTable";
import { SheetRow } from "@/app/lib/sheets";

const REFRESH_INTERVAL = 30_000; // 30 seconds

const customerColumns = [
  { key: "Name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "Purchases", label: "Purchases" },
  { key: "call_status", label: "Call Status" },
  { key: "call time", label: "Call Time" },
  { key: "transcript_summary", label: "Summary", width: "200px" },
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
};

const contentStatusColors: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  incomplete: "bg-yellow-50 text-yellow-700",
};

export default function DataPage() {
  const [activeTab, setActiveTab] = useState<"customers" | "content">(
    "customers"
  );
  const [customers, setCustomers] = useState<SheetRow[]>([]);
  const [content, setContent] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/sheets?sheet=${activeTab}`);
      const json = await res.json();
      if (json.success) {
        if (activeTab === "customers") {
          setCustomers(json.data);
        } else {
          setContent(json.data);
        }
        setError(null);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data</h1>
          <p className="text-gray-500 mt-1">
            Live data from your Google Sheets
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Auto-refreshes every 30s
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
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
            className={`px-6 py-3 text-sm font-medium transition-colors ${
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

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500">Loading data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700 font-medium">Failed to load data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
          ) : activeTab === "customers" ? (
            <SheetTable
              data={customers}
              columns={customerColumns}
              expandKey="transcript"
              statusKey="call_status"
              statusColors={callStatusColors}
            />
          ) : (
            <SheetTable
              data={content}
              columns={contentColumns}
              expandKey="Article"
              statusKey="Status"
              statusColors={contentStatusColors}
            />
          )}
        </div>
      </div>
    </div>
  );
}
