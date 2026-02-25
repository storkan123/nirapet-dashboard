"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WorkflowCard from "@/app/components/WorkflowCard";
import { WorkflowInfo } from "@/app/lib/n8n";
import { CallAnalytics } from "@/app/api/sheets/analytics/route";

const REFRESH_INTERVAL = 30_000;

export type TimeRange = "this_month" | "last_3_months" | "all_time";

// Fixed display order: Call Agent → Blog Creator → Purchases → New Customer
const DISPLAY_ORDER = [
  "u4sSYc8PDieJxX_g6VMWl", // AI Voice Agent (Call Agent)
  "lO1Z5m781nQe3HsPYUTch", // Blog Creator
  "ETQm3I9t8ypv6V7eYAVyv", // Purchases
  "LGzQHIALne_MHAHWtdBIQ", // New Customer
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [range, setRange] = useState<TimeRange>("this_month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rangeRef = useRef<TimeRange>("this_month");
  rangeRef.current = range;

  const fetchAnalytics = useCallback(async (r: TimeRange) => {
    try {
      const res = await fetch(`/api/sheets/analytics?range=${r}`);
      const json = await res.json();
      if (json.success) setAnalytics(json.data);
    } catch {
      // analytics failure is non-critical
    }
  }, []);

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [wfRes, analyticsRes] = await Promise.all([
        fetch("/api/workflows"),
        fetch(`/api/sheets/analytics?range=${rangeRef.current}`),
      ]);
      const wfJson = await wfRes.json();
      const analyticsJson = await analyticsRes.json();

      if (wfJson.success) {
        const sorted = DISPLAY_ORDER
          .map((id) => wfJson.data.find((w: WorkflowInfo) => w.id === id))
          .filter(Boolean) as WorkflowInfo[];
        wfJson.data.forEach((w: WorkflowInfo) => {
          if (!DISPLAY_ORDER.includes(w.id)) sorted.push(w);
        });
        setWorkflows(sorted);
        setError(null);
      } else {
        setError(wfJson.error);
      }

      if (analyticsJson.success) setAnalytics(analyticsJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  // Re-fetch analytics whenever range changes
  useEffect(() => {
    fetchAnalytics(range);
  }, [range, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">Failed to load workflows</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Overview</h1>
          <p className="text-gray-500 mt-1">
            Live status of your automation workflows
          </p>
        </div>
        <p className="text-xs text-gray-400">Auto-refreshes every 30s</p>
      </div>

      <div className="flex flex-col gap-4">
        {workflows.map((wf) => {
          const isMain = wf.id === "u4sSYc8PDieJxX_g6VMWl";
          return (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              isMain={isMain}
              analytics={isMain ? analytics : null}
              range={range}
              onRangeChange={setRange}
            />
          );
        })}
      </div>
    </div>
  );
}
