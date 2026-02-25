"use client";

import { Fragment, useState } from "react";
import { SheetRow } from "@/app/lib/sheets";

interface Column {
  key: string;
  label: string;
  expandable?: boolean;
}

interface SheetTableProps {
  data: SheetRow[];
  columns: Column[];
  statusKey?: string;
  statusColors?: Record<string, string>;
}

export default function SheetTable({
  data,
  columns,
  statusKey,
  statusColors = {},
}: SheetTableProps) {
  // Per-row: which expandable field is currently open (null = none)
  const [expandedCells, setExpandedCells] = useState<Record<number, string | null>>({});

  function toggle(rowIdx: number, fieldKey: string) {
    setExpandedCells((prev) => ({
      ...prev,
      [rowIdx]: prev[rowIdx] === fieldKey ? null : fieldKey,
    }));
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-1">No data available</p>
        <p className="text-sm">Google Sheets credentials may not be configured.</p>
      </div>
    );
  }

  const fixedCols = columns.filter((c) => !c.expandable);
  const expandableCols = columns.filter((c) => c.expandable);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {fixedCols.map((col) => (
              <th
                key={col.key}
                className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            {expandableCols.map((col) => (
              <th
                key={col.key}
                className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => {
            const openField = expandedCells[i] ?? null;
            return (
              <Fragment key={i}>
                <tr className="hover:bg-gray-50 transition-colors align-top">
                  {/* Fixed columns */}
                  {fixedCols.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-gray-700">
                      {statusKey && col.key === statusKey ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[(row[col.key] || "").toLowerCase()] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row[col.key] || "—"}
                        </span>
                      ) : col.key === "Purchases" ? (
                        row[col.key] ? (
                          <span className="font-semibold text-emerald-700">
                            {row[col.key].startsWith("$")
                              ? row[col.key]
                              : `$${row[col.key]}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )
                      ) : (
                        <span>{row[col.key] || "—"}</span>
                      )}
                    </td>
                  ))}

                  {/* Expandable columns — clickable chips */}
                  {expandableCols.map((col) => {
                    const val = row[col.key] || "";
                    const isOpen = openField === col.key;
                    if (!val) {
                      return (
                        <td key={col.key} className="py-3 px-4">
                          <span className="text-gray-300 text-xs">—</span>
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="py-3 px-4">
                        <button
                          onClick={() => toggle(i, col.key)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border max-w-[140px] ${
                            isOpen
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <span className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                            ▸
                          </span>
                          <span className="truncate">
                            {val.length > 22 ? val.slice(0, 22) + "…" : val}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>

                {/* Expanded content row */}
                {openField && row[openField] && (
                  <tr>
                    <td
                      colSpan={fixedCols.length + expandableCols.length}
                      className="px-4 pb-4 bg-emerald-50/20"
                    >
                      <div className="border border-emerald-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
                          {expandableCols.find((c) => c.key === openField)?.label}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                          {row[openField]}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
