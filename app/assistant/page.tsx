"use client";

import { useCallback, useEffect, useState } from "react";
import AssistantChat from "@/app/components/AssistantChat";
import { WorkflowInfo } from "@/app/lib/n8n";

const icons: Record<string, string> = {
  "user-plus": "👤",
  phone: "📞",
  "shopping-cart": "🛒",
  pencil: "✏️",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function WorkflowStatusCard({ workflow }: { workflow: WorkflowInfo }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <span className="text-2xl flex-shrink-0">{icons[workflow.icon] || "⚡"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-gray-900 text-sm">{workflow.name}</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              workflow.active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                workflow.active ? "bg-emerald-500" : "bg-gray-400"
              }`}
            ></span>
            {workflow.active ? "Running" : "Off"}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{workflow.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-gray-400">Last ran</div>
        <div className="text-xs font-medium text-gray-700">
          {timeAgo(workflow.stats.lastRun)}
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      const json = await res.json();
      if (json.success) setWorkflows(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
    const interval = setInterval(loadWorkflows, 30_000);
    return () => clearInterval(interval);
  }, [loadWorkflows]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Automation Assistant</h1>
        <p className="text-gray-500 mt-1">
          Ask questions, turn workflows on or off, or request changes — all in plain English.
        </p>
      </div>

      {/* What it can do */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-emerald-800 mb-2">What you can ask:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { icon: "💬", text: "\"What does the AI Voice Agent do?\"" },
            { icon: "🔄", text: "\"Turn off the Blog Creator\"" },
            { icon: "✏️", text: "\"Change the blog to post every 2 days\"" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">{item.icon}</span>
              <span className="text-xs text-emerald-700">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-emerald-600 mt-3 border-t border-emerald-200 pt-2">
          Note: The assistant cannot create new workflows. Any changes to existing workflows are saved as a backup first, so you can always undo them.
        </p>
      </div>

      {/* Two-column layout: status cards + chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: workflow status */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Your Workflows
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((wf) => (
                <WorkflowStatusCard key={wf.id} workflow={wf} />
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700">How edits work: </span>
              When you ask to change a workflow, the assistant turns off the original and creates a new version with your changes. The original is kept as a backup. If you want to undo, just say so.
            </p>
          </div>
        </div>

        {/* Right: chat */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Ask the Assistant
          </h2>
          <AssistantChat />
        </div>
      </div>
    </div>
  );
}
