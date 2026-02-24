"use client";

import { useCallback, useEffect, useState } from "react";
import AssistantChat from "@/app/components/AssistantChat";
import { WorkflowInfo } from "@/app/lib/n8n";
import type { TimelineStep } from "@/app/api/workflow-detail/[id]/route";

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

// ─── Timeline components ─────────────────────────────────────────────────────

function TimelineItem({
  step,
  isLast,
}: {
  step: TimelineStep;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      {/* Dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${
            step.isBranchPoint ? "bg-amber-400" : "bg-emerald-400"
          }`}
        />
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1 min-h-[12px]" />}
      </div>

      {/* Content */}
      <div className="pb-3 flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-800 leading-tight">
          {step.name}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {step.description}
        </div>

        {/* Branch paths */}
        {step.branches && step.branches.length > 0 && (
          <div className="mt-2 space-y-2">
            {step.branches.map((branch, i) => (
              <div
                key={i}
                className={`border-l-2 pl-3 ${
                  i === 0 ? "border-emerald-300" : "border-gray-200"
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1.5 ${
                    i === 0 ? "text-emerald-700" : "text-gray-500"
                  }`}
                >
                  {branch.label}
                </div>
                {branch.steps.length > 0 ? (
                  <WorkflowTimeline steps={branch.steps} />
                ) : (
                  <div className="text-xs text-gray-400 italic">Ends here</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowTimeline({ steps }: { steps: TimelineStep[] }) {
  if (steps.length === 0)
    return <p className="text-xs text-gray-400 italic">No steps found.</p>;
  return (
    <div>
      {steps.map((step, i) => (
        <TimelineItem key={step.id} step={step} isLast={i === steps.length - 1} />
      ))}
    </div>
  );
}

// ─── Workflow status card (expandable) ───────────────────────────────────────

function WorkflowStatusCard({
  workflow,
  expanded,
  onToggle,
  timeline,
  loadingTimeline,
}: {
  workflow: WorkflowInfo;
  expanded: boolean;
  onToggle: () => void;
  timeline: TimelineStep[] | null;
  loadingTimeline: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border transition-shadow ${
        expanded ? "border-emerald-200 shadow-md" : "border-gray-200"
      } overflow-hidden`}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
      >
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
              />
              {workflow.active ? "Running" : "Off"}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{workflow.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs text-gray-400">Last ran</div>
            <div className="text-xs font-medium text-gray-700">
              {timeAgo(workflow.stats.lastRun)}
            </div>
          </div>
          <span
            className={`text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            style={{ fontSize: 10 }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expanded timeline */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pt-4 pb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            How it works — step by step
          </p>
          {loadingTimeline ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-0.5 flex-shrink-0 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : timeline ? (
            <WorkflowTimeline steps={timeline} />
          ) : (
            <p className="text-xs text-gray-400 italic">Could not load steps.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Record<string, TimelineStep[] | null>>({});
  const [loadingTimelines, setLoadingTimelines] = useState<Record<string, boolean>>({});

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

  async function handleToggle(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (id in timelines) return; // already fetched

    setLoadingTimelines((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/workflow-detail/${id}`);
      const json = await res.json();
      setTimelines((prev) => ({
        ...prev,
        [id]: json.success ? json.timeline : null,
      }));
    } catch {
      setTimelines((prev) => ({ ...prev, [id]: null }));
    } finally {
      setLoadingTimelines((prev) => ({ ...prev, [id]: false }));
    }
  }

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
            { icon: "💬", text: '"What does the AI Voice Agent do?"' },
            { icon: "🔄", text: '"Turn off the Blog Creator"' },
            { icon: "✏️", text: '"Change the blog to post every 2 days"' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">{item.icon}</span>
              <span className="text-xs text-emerald-700">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-emerald-600 mt-3 border-t border-emerald-200 pt-2">
          Note: The assistant cannot create new workflows. Any changes to existing workflows are
          saved as a backup first, so you can always undo them.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: workflow status */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Your Workflows
          </h2>
          <p className="text-xs text-gray-400 mb-3">Click any workflow to see how it works step by step.</p>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-16"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((wf) => (
                <WorkflowStatusCard
                  key={wf.id}
                  workflow={wf}
                  expanded={expandedId === wf.id}
                  onToggle={() => handleToggle(wf.id)}
                  timeline={timelines[wf.id] ?? null}
                  loadingTimeline={!!loadingTimelines[wf.id]}
                />
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700">How edits work: </span>
              When you ask to change a workflow, the assistant turns off the original and creates a
              new version with your changes. The original is kept as a backup. If you want to undo,
              just say so.
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
