const N8N_API_URL = process.env.N8N_API_URL!;
const N8N_API_KEY = process.env.N8N_API_KEY!;

const WORKFLOW_META: Record<string, { name: string; description: string; icon: string }> = {
  "LGzQHIALne_MHAHWtdBIQ": {
    name: "New Customer",
    description: "Captures new Shopify customers and logs them to tracking sheet",
    icon: "user-plus",
  },
  "u4sSYc8PDieJxX_g6VMWl": {
    name: "AI Voice Agent",
    description: "Calls new customers via Vapi.ai to welcome them and gather feedback",
    icon: "phone",
  },
  "ETQm3I9t8ypv6V7eYAVyv": {
    name: "Purchases",
    description: "Tracks Shopify orders and updates customer purchase history",
    icon: "shopping-cart",
  },
  "lO1Z5m781nQe3HsPYUTch": {
    name: "Blog Creator",
    description: "Writes and publishes SEO blog posts to Shopify daily",
    icon: "pencil",
  },
};

const TARGET_WORKFLOW_IDS = Object.keys(WORKFLOW_META);

async function n8nFetch(path: string, options?: { method?: string; body?: object }) {
  const method = options?.method ?? "GET";
  const res = await fetch(`${N8N_API_URL}/api/v1${path}`, {
    method,
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    ...(method === "GET" ? { next: { revalidate: 30 } } : { cache: "no-store" }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let detail = "";
    try { detail = JSON.parse(errText)?.message ?? errText; } catch { detail = errText; }
    throw new Error(`n8n API error ${res.status}: ${detail}`);
  }
  // Some endpoints return empty body (204)
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export interface WorkflowExecution {
  id: string;
  status: "success" | "error" | "waiting" | "running";
  startedAt: string;
  stoppedAt: string | null;
}

export interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  updatedAt: string;
  executions: WorkflowExecution[];
  stats: {
    total: number;
    success: number;
    error: number;
    successRate: number;
    lastRun: string | null;
    monthlyRuns: number;
    monthlySuccess: number;
  };
}

export { WORKFLOW_META, TARGET_WORKFLOW_IDS };

export async function getWorkflowDetail(id: string): Promise<Record<string, unknown>> {
  return n8nFetch(`/workflows/${id}`);
}

export async function toggleWorkflow(id: string, activate: boolean): Promise<void> {
  const action = activate ? "activate" : "deactivate";
  await n8nFetch(`/workflows/${id}/${action}`, { method: "POST" });
}

// n8n Create Workflow API only accepts these fields — everything else causes a 400
const WORKFLOW_CREATE_FIELDS = new Set(["name", "nodes", "connections", "settings", "staticData"]);

export async function createSafeCopy(
  originalId: string,
  modifiedWorkflow: Record<string, unknown>,
  changeSummary: string
): Promise<{ originalId: string; newId: string; changeSummary: string }> {
  // 1. Deactivate original
  await n8nFetch(`/workflows/${originalId}/deactivate`, { method: "POST" });

  // 2. Build the POST body — only the fields n8n accepts
  const originalName = (modifiedWorkflow.name as string) || "Workflow";
  const copyName = `${originalName} (AI Edit — ${new Date().toLocaleDateString()})`;

  const copyBody: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(modifiedWorkflow)) {
    if (WORKFLOW_CREATE_FIELDS.has(k)) copyBody[k] = v;
  }
  copyBody.name = copyName;

  const created = await n8nFetch(`/workflows`, { method: "POST", body: copyBody });

  // 3. Activate the copy
  await n8nFetch(`/workflows/${created.id}/activate`, { method: "POST" });

  return { originalId, newId: created.id, changeSummary };
}

export async function restoreOriginal(
  originalId: string,
  modifiedCopyId: string
): Promise<void> {
  await n8nFetch(`/workflows/${modifiedCopyId}/deactivate`, { method: "POST" });
  await n8nFetch(`/workflows/${originalId}/activate`, { method: "POST" });
}

export async function getWorkflows(): Promise<WorkflowInfo[]> {
  const workflowsRes = await n8nFetch("/workflows");
  const allWorkflows = workflowsRes.data || [];

  const results: WorkflowInfo[] = [];

  for (const id of TARGET_WORKFLOW_IDS) {
    const wf = allWorkflows.find((w: { id: string }) => w.id === id);
    if (!wf) continue;

    let executions: WorkflowExecution[] = [];
    try {
      const execRes = await n8nFetch(`/executions?workflowId=${id}&limit=25`);
      executions = (execRes.data || []).map((e: Record<string, unknown>) => ({
        id: e.id,
        status: e.status,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
      }));
    } catch {
      // executions API might fail, continue with empty
    }

    const total = executions.length;
    const success = executions.filter((e) => e.status === "success").length;
    const error = executions.filter((e) => e.status === "error").length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthlyExecs = executions.filter((e) => {
      const t = new Date(e.startedAt).getTime();
      return t >= monthStart;
    });
    const monthlyRuns = monthlyExecs.length;
    const monthlySuccess = monthlyExecs.filter((e) => e.status === "success").length;

    results.push({
      id,
      name: WORKFLOW_META[id].name,
      description: WORKFLOW_META[id].description,
      icon: WORKFLOW_META[id].icon,
      active: wf.active,
      updatedAt: wf.updatedAt,
      executions,
      stats: {
        total,
        success,
        error,
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
        lastRun: executions[0]?.stoppedAt || executions[0]?.startedAt || null,
        monthlyRuns,
        monthlySuccess,
      },
    });
  }

  return results;
}
