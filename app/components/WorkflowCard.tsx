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
      <ResponsiveContainer width="100%" height={120}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={32}
            outerRadius={52}
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
    <ResponsiveContainer width="100%" height={140}>
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
        className="text-4xl font-bold"
        style={{ color: score > 0 ? color : "#d1d5db" }}
      >
        {score > 0 ? score.toFixed(1) : "—"}
      </div>
      <div className="text-xs text-gray-400">out of 10</div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div
        className="text-xs font-medium"
        style={{ color: score > 0 ? color : "#9ca3af" }}
      >
        {label} Intent
      </div>
    </div>
  );
}

// ── Top Objections ───────────────────────────────────────────────────────────
function ObjectionBars({
  objections,
}: {
  objections: CallAnalytics["topObjections"];
}) {
  if (objections.length === 0)
    return <p className="text-sm text-gray-400">No objections recorded yet</p>;

  const max = objections[0].count;
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {objections.map((o) => (
        <div key={o.label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-600 truncate shrink-0">{o.label}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-indigo-400 transition-all duration-700"
              style={{ width: `${(o.count / max) * 100}%` }}
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

// ── Main Card ────────────────────────────────────────────────────────────────
interface WorkflowCardProps {
  workflow: WorkflowInfo;
  isMain?: boolean;
  analytics?: CallAnalytics | null;
  monthLabel?: string;
}

export default function WorkflowCard({
  workflow,
  isMain = false,
  analytics,
  monthLabel,
}: WorkflowCardProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleExecutions = showAll
    ? workflow.executions
    : workflow.executions.slice(0, 4);

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
                isMain ? "text-lg" : "text-base"
              }`}
            >
              {workflow.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">{workflow.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Stats */}
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

          {/* Execution dots */}
          <div className="hidden md:flex items-center gap-1">
            {workflow.executions.slice(0, 6).map((exec) => (
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
                workflow.active ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            {workflow.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* ── Monthly note for non-main cards ── */}
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

      {/* ── Call Agent monthly analytics section ── */}
      {isMain && analytics && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-semibold text-gray-700">
              {monthLabel || "This Month"}
            </h4>
            <div className="flex items-center gap-5 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-800">
                  {analytics.callsAnswered}
                </span>{" "}
                answered
              </span>
              <span>
                <span className="font-semibold text-gray-800">
                  {analytics.answerRate}%
                </span>{" "}
                answer rate
              </span>
              <span>
                <span className="font-semibold text-gray-800">
                  {analytics.totalCustomers}
                </span>{" "}
                total leads
              </span>
            </div>
          </div>

          {/* Charts — 3 columns */}
          <div className="grid grid-cols-3 gap-6 mb-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">
                Sentiment
              </p>
              <SentimentDonut data={analytics.sentimentBreakdown} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">
                Interest Level
              </p>
              <InterestBars data={analytics.interestBreakdown} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">
                Purchase Intent
              </p>
              <IntentGauge score={analytics.avgPurchaseIntent} />
            </div>
          </div>

          {/* Top objections */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Top Objections
            </p>
            <ObjectionBars objections={analytics.topObjections} />
          </div>
        </div>
      )}

      {/* ── Executions list (main card only) ── */}
      {isMain && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-400 mb-2">
            Recent Executions
          </div>
          <div className="flex flex-col gap-1">
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
          </div>
          {workflow.executions.length > 4 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {showAll
                ? "Show Less"
                : `See More (${workflow.executions.length - 4} more)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
