"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { WorkflowInfo } from "@/app/lib/n8n";
import { CallAnalytics } from "@/app/api/sheets/analytics/route";
import { PurchaseStats } from "@/app/api/sheets/purchase-stats/route";
import { MonthlyPurchase } from "@/app/api/sheets/purchase-history/route";
import { TimeRange } from "@/app/lib/types";

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

// ── % Change Badge ──────────────────────────────────────────────────────────
function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pctChange = Math.round(((current - previous) / previous) * 100);
  if (pctChange === 0) return null;
  const isUp = pctChange > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
        isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {isUp ? "↑" : "↓"} {Math.abs(pctChange)}%
    </span>
  );
}

// ── Hero Metric Chart (Databox-style) ───────────────────────────────────────
function HeroMetricChart({
  title,
  rangeLabel,
  heroValue,
  heroSuffix,
  currentTotal,
  previousTotal,
  previousLabel,
  accentColor,
  data,
  dataKeys,
  legendLabels,
}: {
  title: string;
  rangeLabel: string;
  heroValue: string;
  heroSuffix?: string;
  currentTotal: number;
  previousTotal: number;
  previousLabel?: string;
  accentColor: string;
  data: Record<string, unknown>[];
  dataKeys: { current: string; previous: string };
  legendLabels: { current: string; previous: string };
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </p>
        <p className="text-xs text-gray-400">{rangeLabel}</p>
      </div>

      {/* Hero number + badge */}
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-4xl font-bold text-gray-900">
          {heroValue}
          {heroSuffix && (
            <span className="text-lg font-medium text-gray-400 ml-1">{heroSuffix}</span>
          )}
        </span>
        <ChangeBadge current={currentTotal} previous={previousTotal} />
      </div>
      {previousLabel && previousTotal > 0 && (
        <p className="text-xs text-gray-400 mb-3">
          Comparison period: {previousTotal}{previousLabel}
        </p>
      )}

      {/* Area chart */}
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
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
            />
            <Area
              type="monotone"
              dataKey={dataKeys.current}
              stroke={accentColor}
              strokeWidth={2.5}
              fill={`url(#fill-${title.replace(/\s/g, "")})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey={dataKeys.previous}
              stroke="#d1d5db"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Not enough data for chart
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: accentColor }} />
          {legendLabels.current}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-0.5 rounded border-t border-dashed border-gray-400" />
          {legendLabels.previous}
        </div>
      </div>
    </div>
  );
}

// ── Two-Line Hero Chart (Hot Leads + Purchases) ────────────────────────────
function DualMetricChart({
  title,
  rangeLabel,
  hero1Value,
  hero1Label,
  hero2Value,
  hero2Label,
  color1,
  color2,
  data,
}: {
  title: string;
  rangeLabel: string;
  hero1Value: number;
  hero1Label: string;
  hero2Value: number;
  hero2Label: string;
  color1: string;
  color2: string;
  data: { date: string; hotLeads: number; purchases: number }[];
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </p>
        <p className="text-xs text-gray-400">{rangeLabel}</p>
      </div>

      {/* Hero numbers */}
      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <span className="text-4xl font-bold text-gray-900">{hero1Value}</span>
          <span className="text-xs text-gray-400 ml-1.5">{hero1Label}</span>
        </div>
        <div className="text-gray-300">|</div>
        <div>
          <span className="text-4xl font-bold text-gray-900">{hero2Value}</span>
          <span className="text-xs text-gray-400 ml-1.5">{hero2Label}</span>
        </div>
      </div>

      {/* Line chart */}
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillHotLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color1} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color1} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillPurchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color2} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color2} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="hotLeads"
              name="Hot Leads"
              stroke={color1}
              strokeWidth={2.5}
              fill="url(#fillHotLeads)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="purchases"
              name="Purchases"
              stroke={color2}
              strokeWidth={2.5}
              fill="url(#fillPurchases)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Not enough data for chart
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color1 }} />
          {hero1Label}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color2 }} />
          {hero2Label}
        </div>
      </div>
    </div>
  );
}

// ── KPI Tile (small metric with % change badge) ────────────────────────────
function KpiTile({
  label,
  value,
  suffix,
  current,
  previous,
}: {
  label: string;
  value: string;
  suffix?: string;
  current: number;
  previous: number;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">
          {value}
          {suffix && <span className="text-base font-medium text-gray-400">{suffix}</span>}
        </span>
      </div>
      <div className="mt-1.5">
        <ChangeBadge current={current} previous={previous} />
      </div>
    </div>
  );
}

// ── Objections Overview Table (Databox "Campaigns Overview" style) ──────────
function ObjectionsTable({
  items,
}: {
  items: { label: string; count: number }[];
}) {
  const total = items.reduce((sum, o) => sum + o.count, 0);
  if (items.length === 0)
    return <p className="text-sm text-gray-400">No objections recorded</p>;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_60px_60px] gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-200">
        <span>#</span>
        <span>Objection</span>
        <span className="text-right">Count</span>
        <span className="text-right">%</span>
      </div>
      {/* Rows */}
      {items.map((o, i) => (
        <div
          key={o.label}
          className="grid grid-cols-[auto_1fr_60px_60px] gap-2 py-2.5 border-b border-gray-100 last:border-0 items-center"
        >
          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
          <span className="text-sm text-gray-700 font-medium truncate">{o.label}</span>
          <span className="text-sm text-gray-900 font-semibold text-right">{o.count}</span>
          <span className="text-xs text-gray-400 text-right">
            {total > 0 ? Math.round((o.count / total) * 100) : 0}%
          </span>
        </div>
      ))}
    </div>
  );
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

// ── Purchase Line Chart ───────────────────────────────────────────────────────
function PurchaseLineChart({ data }: { data: MonthlyPurchase[] }) {
  const hasData = data.some((d) => d.total > 0);
  if (!hasData)
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No purchase data yet
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.split(" ")[0]} // show "Jan", "Feb" etc.
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            borderRadius: 8,
          }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

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
  purchaseStats?: PurchaseStats | null;
  purchaseHistory?: MonthlyPurchase[] | null;
}

export default function WorkflowCard({
  workflow,
  isMain = false,
  analytics,
  range = "this_month",
  onRangeChange,
  purchaseStats,
  purchaseHistory,
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

      {/* ── Purchase revenue stats (Purchases card only) ── */}
      {purchaseStats && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Purchases from Calls
            </p>
            <p className="text-xs text-gray-400 italic">
              Purchases made after AI Voice Agent calls
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gray-900">
                ${purchaseStats.thisMonth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">This Month</div>
              <div className="text-xs text-gray-400">{purchaseStats.thisMonthCount} orders</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-700">
                ${purchaseStats.last3Months.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-emerald-600 mt-0.5">Last 3 Months</div>
              <div className="text-xs text-emerald-400">{purchaseStats.last3MonthsCount} orders</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-700">
                ${purchaseStats.allTime.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-blue-600 mt-0.5">All Time</div>
              <div className="text-xs text-blue-400">{purchaseStats.allTimeCount} orders</div>
            </div>
          </div>

          {/* Line chart: purchases over last 6 months */}
          {purchaseHistory && purchaseHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Revenue from Calls — Last 6 Months
              </p>
              <PurchaseLineChart data={purchaseHistory} />
            </div>
          )}
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
              {/* ── Databox-style hero charts ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <HeroMetricChart
                  title="Purchase Intent Score"
                  rangeLabel={analytics.rangeLabel}
                  heroValue={
                    analytics.avgPurchaseIntent > 0
                      ? analytics.avgPurchaseIntent.toFixed(1)
                      : "—"
                  }
                  heroSuffix="/10"
                  currentTotal={analytics.avgPurchaseIntent}
                  previousTotal={analytics.previousPeriod?.avgPurchaseIntent ?? 0}
                  previousLabel=""
                  accentColor="#f59e0b"
                  data={analytics.dailyIntent}
                  dataKeys={{ current: "current", previous: "previous" }}
                  legendLabels={{
                    current: analytics.rangeLabel,
                    previous: "Previous Period",
                  }}
                />
                <DualMetricChart
                  title="Hot Leads & Purchases"
                  rangeLabel={analytics.rangeLabel}
                  hero1Value={analytics.interestBreakdown.hot}
                  hero1Label="Hot Leads"
                  hero2Value={analytics.totalPurchasesPostCall}
                  hero2Label="Purchased"
                  color1="#f97316"
                  color2="#10b981"
                  data={analytics.dailyHotLeads}
                />
              </div>

              {/* ── KPI tiles + Objections table ── */}
              <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_2fr] gap-4 mb-6">
                <div className="grid grid-cols-2 gap-4 col-span-2 md:col-span-2">
                  <KpiTile
                    label="Answer Rate"
                    value={`${analytics.answerRate}`}
                    suffix="%"
                    current={analytics.answerRate}
                    previous={analytics.previousPeriod?.answerRate ?? 0}
                  />
                  <KpiTile
                    label="Avg Intent"
                    value={
                      analytics.avgPurchaseIntent > 0
                        ? analytics.avgPurchaseIntent.toFixed(1)
                        : "—"
                    }
                    current={analytics.avgPurchaseIntent}
                    previous={analytics.previousPeriod?.avgPurchaseIntent ?? 0}
                  />
                  <KpiTile
                    label="Interested %"
                    value={`${analytics.interestedPct}`}
                    suffix="%"
                    current={analytics.interestedPct}
                    previous={analytics.previousPeriod?.interestedPct ?? 0}
                  />
                  <KpiTile
                    label="Objections"
                    value={`${analytics.objectionCount}`}
                    current={analytics.objectionCount}
                    previous={analytics.previousPeriod?.objectionCount ?? 0}
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-5 col-span-2 md:col-span-1">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Top Objections
                    </p>
                    <p className="text-xs text-gray-400">{analytics.rangeLabel}</p>
                  </div>
                  <ObjectionsTable items={analytics.topObjections} />
                </div>
              </div>

              {/* ── Original KPI boxes ── */}
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
