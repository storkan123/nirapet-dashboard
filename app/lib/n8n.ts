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

async function n8nFetch(path: string) {
  const res = await fetch(`${N8N_API_URL}/api/v1${path}`, {
    headers: { "X-N8N-API-KEY": N8N_API_KEY },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`n8n API error: ${res.status}`);
  return res.json();
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
  };
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
      },
    });
  }

  return results;
}
