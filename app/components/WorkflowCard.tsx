"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WorkflowInfo } from "@/app/lib/n8n";
import { CallAnalytics } from "@/app/api/sheets/analytics/route";
import { TimeRange } from "@/app/page";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "this_month", label: "This Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "all_time", label: "All Time" },
];

const icons: Record<string, string> = {
  "user-plus": "👤",
  phone: "📞",
  "shopping-cart": "🛒",
  pencil: "✏️",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Sentiment Donut ──────────────────────────────────────────────────────────
function SentimentDonut({ data }: { data: CallAnalytics["sentimentBreakdown"] }) {
  const total = data.positive + data.neutral + data.negative;
  const chartData = [
    { name: "Positive", value: data.positive, color: "#10b981" },
    { name: "Neutral", value: data.neutral, color: "#6b7280" },
    { name: "Negative", value: data.negative, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  if (total === 0)
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No data yet
      </div>
    );

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={36}
            outerRadius={56}
            dataKey="value"
            strokeWidth={2}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-1 flex-wrap justify-center">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1 text-xs text-gray-500">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: d.color }}
            />
            {d.name} {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Interest Bar Chart ───────────────────────────────────────────────────────
function InterestBars({ data }: { data: CallAnalytics["interestBreakdown"] }) {
  const chartData = [
    { name: "Hot", value: data.hot, color: "#f97316" },
    { name: "Warm", value: data.warm, color: "#f59e0b" },
    { name: "Cold", value: data.cold, color: "#60a5fa" },
    { name: "Not Int.", value: data.not_interested, color: "#d1d5db" },
  ];

  const hasData = chartData.some((d) => d.value > 0);
  if (!hasData)
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No data yet
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart
        data={chartData}
        barSize={24}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            borderRadius: 8,
          }}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Purchase Intent Gauge ────────────────────────────────────────────────────
function IntentGauge({ score }: { score: number }) {
  const color = score >= 7 ? "#10b981" : score >= 4 ? "#f59e0b" : "#ef4444";
  const label = score >= 7 ? "High" : score >= 4 ? "Medium" : score > 0 ? "Low" : "—";
  const pct = score > 0 ? (score / 10) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 pt-4">
      <div
        className="text-5xl font-bold"
        style={{ color: score > 0 ? color : "#d1d5db" }}
      >
        {score > 0 ? score.toFixed(1) : "—"}
      </div>
      <div className="text-xs text-gray-400">out of 10</div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div
        className="text-sm font-semibold"
        style={{ color: score > 0 ? color : "#9ca3af" }}
      >
        {label} Intent
      </div>
    </div>
  );
}

// ── Horizontal bar chart (shared by outcomes + objections) ───────────────────
function HorizBars({
  items,
  colorFn,
}: {
  items: { label: string; count: number }[];
  colorFn?: (label: string) => string;
}) {
  if (items.length === 0)
    return <p className="text-sm text-gray-400">No data yet</p>;
  const max = items[0].count;
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {items.map((o) => (
        <div key={o.label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-600 truncate shrink-0 capitalize">
            {o.label.replace(/_/g, " ")}
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${(o.count / max) * 100}%`,
                backgroundColor: colorFn ? colorFn(o.label) : "#818cf8",
              }}
            />
          </div>
          <div className="text-xs font-medium text-gray-500 w-4 text-right shrink-0">
            {o.count}
          </div>
        </div>
      ))}
    </div>
  );
}

const OUTCOME_COLORS: Record<string, string> = {
  interested: "#10b981",
  needs_more_info: "#f59e0b",
  no_decision: "#6b7280",
  not_interested: "#ef4444",
};

// ── Loading skeleton ─────────────────────────────────────────────────────────
function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-20" />
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-40" />
        ))}
      </div>
      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-100 rounded-xl h-28" />
        <div className="bg-gray-100 rounded-xl h-28" />
      </div>
    </div>
  );
}

// ── Main Card ────────────────────────────────────────────────────────────────
interface WorkflowCardProps {
  workflow: WorkflowInfo;
  isMain?: boolean;
  analytics?: CallAnalytics | null;
  range?: TimeRange;
  onRangeChange?: (r: TimeRange) => void;
}

export default function WorkflowCard({
  workflow,
  isMain = false,
  analytics,
  range = "this_month",
  onRangeChange,
}: WorkflowCardProps) {
  const [showExecs, setShowExecs] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visibleExecutions = showAll
    ? workflow.executions
    : workflow.executions.slice(0, 5);

  // Build call outcomes as sorted array for HorizBars
  const outcomesItems = analytics
    ? Object.entries(analytics.callOutcomes)
        .map(([label, count]) => ({ label, count }))
        .filter((o) => o.count > 0)
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow ${
        isMain ? "p-6" : "p-4"
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={isMain ? "text-2xl" : "text-xl"}>
            {icons[workflow.icon] || "⚡"}
          </span>
          <div className="min-w-0">
            <h3
              className={`font-semibold text-gray-900 ${
                isMain ? "text-xl" : "text-base"
              }`}
            >
              {workflow.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">{workflow.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Execution dots */}
          <div className="hidden md:flex items-center gap-1">
            {workflow.executions.slice(0, 8).map((exec) => (
              <span
                key={exec.id}
                title={exec.status}
                className={`w-2 h-2 rounded-full ${
                  exec.status === "success"
                    ? "bg-emerald-400"
                    : exec.status === "error"
                    ? "bg-red-400"
                    : exec.status === "running"
                    ? "bg-blue-400"
                    : "bg-yellow-400"
                }`}
              />
            ))}
          </div>

          {/* Stats (non-main) */}
          {!isMain && (
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <span className="text-gray-400">
                <span className="font-semibold text-gray-700">{workflow.stats.total}</span>{" "}
                runs
              </span>
              <span className="font-semibold text-emerald-600">
                {workflow.stats.successRate}%
              </span>
              {workflow.stats.error > 0 && (
                <span className="font-semibold text-red-500">
                  {workflow.stats.error} err
                </span>
              )}
            </div>
          )}

          {/* Last run */}
          {workflow.stats.lastRun && (
            <span className="text-xs text-gray-400 hidden lg:block">
              {timeAgo(workflow.stats.lastRun)}
            </span>
          )}

          {/* Active badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              workflow.active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                workflow.active ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            {workflow.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* ── Monthly note for secondary cards ── */}
      {!isMain && workflow.stats.monthlyRuns > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span>
            <span className="font-semibold text-gray-700">
              {workflow.stats.monthlyRuns}
            </span>{" "}
            runs this month
          </span>
          <span>
            <span className="font-semibold text-emerald-600">
              {workflow.stats.monthlySuccess}
            </span>{" "}
            successful
          </span>
        </div>
      )}

      {/* ── Call Agent analytics dashboard ── */}
      {isMain && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          {/* Filter pills + range label */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onRangeChange?.(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    range === opt.value
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {analytics && (
              <span className="text-sm font-semibold text-gray-500">
                {analytics.rangeLabel}
              </span>
            )}
          </div>

          {/* Show skeleton while loading */}
          {!analytics && <AnalyticsSkeleton />}

          {analytics && (
            <>
              {/* KPI boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {analytics.totalCustomers}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Total Leads</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-700">
                    {analytics.callsAnswered}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">Calls Answered</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">
                    {analytics.answerRate}%
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Answer Rate</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-amber-700">
                    {analytics.avgPurchaseIntent > 0
                      ? analytics.avgPurchaseIntent.toFixed(1)
                      : "—"}
                  </div>
                  <div className="text-xs text-amber-600 mt-1">Avg Intent Score</div>
                  {analytics.avgPurchaseIntent > 0 && (
                    <div className="mt-2 bg-amber-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-amber-500 transition-all duration-700"
                        style={{
                          width: `${(analytics.avgPurchaseIntent / 10) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 text-center">
                    Sentiment
                  </p>
                  <SentimentDonut data={analytics.sentimentBreakdown} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 text-center">
                    Interest Level
                  </p>
                  <InterestBars data={analytics.interestBreakdown} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 text-center">
                    Purchase Intent
                  </p>
                  <IntentGauge score={analytics.avgPurchaseIntent} />
                </div>
              </div>

              {/* Bottom: outcomes + objections side by side */}
              <div className="grid grid-cols-2 gap-6 border-t border-gray-100 pt-5">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Call Outcomes
                  </p>
                  <HorizBars
                    items={outcomesItems}
                    colorFn={(label) => OUTCOME_COLORS[label] ?? "#818cf8"}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Top Objections
                  </p>
                  <HorizBars items={analytics.topObjections} />
                </div>
              </div>
            </>
          )}

          {/* Recent executions (collapsible) */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowExecs(!showExecs)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span
                className={`inline-block transition-transform ${showExecs ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              Recent Executions
            </button>

            {showExecs && (
              <div className="mt-3 flex flex-col gap-1">
                {visibleExecutions.map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          exec.status === "success"
                            ? "bg-emerald-500"
                            : exec.status === "error"
                            ? "bg-red-500"
                            : exec.status === "running"
                            ? "bg-blue-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <span className="text-gray-700 capitalize">{exec.status}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {exec.stoppedAt
                        ? timeAgo(exec.stoppedAt)
                        : exec.startedAt
                        ? "running..."
                        : "—"}
                    </span>
                  </div>
                ))}
                {workflow.executions.length === 0 && (
                  <div className="text-sm text-gray-400">No recent executions</div>
                )}
                {workflow.executions.length > 5 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {showAll
                      ? "Show less"
                      : `${workflow.executions.length - 5} more`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
