"use client";

import { Fragment, useState } from "react";
import { SheetRow } from "@/app/lib/sheets";

interface SheetTableProps {
  data: SheetRow[];
  columns: { key: string; label: string; width?: string }[];
  expandKey?: string;
  statusKey?: string;
  statusColors?: Record<string, string>;
}

export default function SheetTable({
  data,
  columns,
  expandKey,
  statusKey,
  statusColors = {},
}: SheetTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-1">No data available</p>
        <p className="text-sm">
          Google Sheets credentials may not be configured yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {expandKey && <th className="w-8 py-3 px-2"></th>}
            {columns.map((col) => (
              <th
                key={col.key}
                className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => (
            <Fragment key={i}>
              <tr
                className={`hover:bg-gray-50 transition-colors ${
                  expandKey && row[expandKey] ? "cursor-pointer" : ""
                }`}
                onClick={() => {
                  if (expandKey && row[expandKey]) {
                    setExpandedRow(expandedRow === i ? null : i);
                  }
                }}
              >
                {expandKey && (
                  <td className="py-3 px-2 text-gray-400">
                    {row[expandKey] ? (
                      <span
                        className={`inline-block transition-transform ${
                          expandedRow === i ? "rotate-90" : ""
                        }`}
                      >
                        ▸
                      </span>
                    ) : null}
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-gray-700">
                    {statusKey && col.key === statusKey ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[row[col.key]?.toLowerCase()] ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {row[col.key] || "—"}
                      </span>
                    ) : col.key === "Purchases" && row[col.key] ? (
                      <span className="font-medium text-emerald-700">
                        ${row[col.key]}
                      </span>
                    ) : (
                      <span className="truncate block max-w-xs">
                        {row[col.key] || "—"}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              {expandKey && expandedRow === i && row[expandKey] && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-6 py-4 bg-gray-50"
                  >
                    <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {row[expandKey]}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
