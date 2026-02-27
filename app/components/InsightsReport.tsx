"use client";

import { useState } from "react";

export interface InsightsSection {
  title: string;
  preview: string;
  content: string;
  icon: string;
}

export interface InsightsData {
  month: string;
  sections: InsightsSection[];
}

interface InsightsReportProps {
  data: InsightsData | null;
  loading: boolean;
}

function SectionCard({
  section,
  defaultOpen = false,
}: {
  section: InsightsSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Format content: lines starting with - become indented bullets
  // Lines ending with : get slightly bolder rendering via span
  const formattedLines = section.content.split("\n").map((line, i) => {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (trimmed.startsWith("- ")) {
      return (
        <div key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-1" />
          <span>{trimmed.slice(2)}</span>
        </div>
      );
    }

    if (trimmed === "") {
      return <div key={i} className="h-2" />;
    }

    const isSubheading = trimmed.endsWith(":") && trimmed.length < 80;
    return (
      <p
        key={i}
        className={`text-sm leading-relaxed ${
          isSubheading
            ? "font-semibold text-gray-800 mt-3 mb-0.5"
            : "text-gray-700"
        }`}
        style={{ paddingLeft: `${indent * 0.5}rem` }}
      >
        {trimmed}
      </p>
    );
  });

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left bg-white hover:bg-gray-50/70 transition-colors"
      >
        <span className="text-xl mt-0.5 shrink-0">{section.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide leading-tight">
              {section.title}
            </h3>
            <span
              className={`text-gray-400 text-xs transition-transform duration-200 shrink-0 ${
                open ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
          </div>

          {/* Preview — only when collapsed */}
          {!open && (
            <p className="text-sm text-gray-500 mt-1 leading-snug line-clamp-2">
              {section.preview}
            </p>
          )}
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-gray-50/40 flex flex-col gap-0.5">
            {formattedLines}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsightsReport({ data, loading }: InsightsReportProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {/* Header skeleton */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-6 animate-pulse">
          <div className="h-7 w-48 bg-emerald-200/60 rounded-lg mb-3" />
          <div className="h-4 w-64 bg-emerald-100 rounded" />
        </div>
        {/* Section skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gray-200 rounded-full" />
              <div>
                <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-72 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-700 font-semibold text-lg">No report yet</p>
        <p className="text-gray-400 text-sm mt-1 max-w-sm">
          The monthly AI report will appear here after the first workflow run on
          the 1st of the month.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Report header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">
              Monthly Report
            </p>
            <h2 className="text-2xl font-bold leading-tight">
              {data.month || "Consumer Insights"}
            </h2>
            <p className="text-emerald-200 text-sm mt-1">
              Consumer insights from your sales calls · {data.sections.length} sections
            </p>
          </div>
          <span className="shrink-0 bg-white/15 border border-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
            AI Generated
          </span>
        </div>

        {/* Section count pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          {data.sections.map((s) => (
            <span
              key={s.title}
              className="text-xs bg-white/10 border border-white/15 text-emerald-100 px-2.5 py-1 rounded-full"
            >
              {s.icon} {s.title.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Accordion sections */}
      <div className="flex flex-col gap-2">
        {data.sections.map((section, i) => (
          <SectionCard
            key={section.title}
            section={section}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
