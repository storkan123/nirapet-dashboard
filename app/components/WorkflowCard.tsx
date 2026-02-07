"use client";

import { useState } from "react";
import { WorkflowInfo } from "@/app/lib/n8n";

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

export default function WorkflowCard({ workflow }: { workflow: WorkflowInfo }) {
  const [showAll, setShowAll] = useState(false);
  const visibleExecutions = showAll ? workflow.executions : workflow.executions.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icons[workflow.icon] || "⚡"}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {workflow.name}
            </h3>
            <p className="text-sm text-gray-500">{workflow.description}</p>
          </div>
        </div>
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
          ></span>
          {workflow.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {workflow.stats.total}
          </div>
          <div className="text-xs text-gray-500">Runs (recent)</div>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-700">
            {workflow.stats.successRate}%
          </div>
          <div className="text-xs text-gray-500">Success rate</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {workflow.stats.error}
          </div>
          <div className="text-xs text-red-500">Errors</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">
          Recent Executions
        </div>
        <div className="flex flex-col gap-1.5">
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
                ></span>
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
        {workflow.executions.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {showAll ? "Show Less" : `See More (${workflow.executions.length - 5} more)`}
          </button>
        )}
      </div>

      {workflow.stats.lastRun && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
          Last run: {timeAgo(workflow.stats.lastRun)}
        </div>
      )}
    </div>
  );
}
