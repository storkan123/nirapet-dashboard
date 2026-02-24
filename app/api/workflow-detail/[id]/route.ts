import { NextResponse } from "next/server";
import { getWorkflowDetail } from "@/app/lib/n8n";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface N8NNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}

export interface TimelineStep {
  id: string;
  name: string;
  description: string;
  isBranchPoint: boolean;
  branches?: { label: string; steps: TimelineStep[] }[];
}

// ─── Node → plain English ─────────────────────────────────────────────────────

function describeNode(node: N8NNode): string {
  const type = node.type.split(".").pop() ?? "";
  const p = (node.parameters ?? {}) as Record<string, unknown>;
  const name = node.name;

  switch (type) {
    // Triggers
    case "shopifyTrigger":
      return "Watches your Shopify store and starts the automation when something new happens (like a new customer or order)";
    case "scheduleTrigger":
      return "Runs this automation automatically on a set schedule";
    case "webhook":
    case "webhookTrigger":
      return "Starts when it receives a signal from another connected system";
    case "formTrigger":
      return "Starts when someone submits a form";
    case "emailTrigger":
    case "gmailTrigger":
      return "Starts when a new email arrives";

    // Google Sheets
    case "googleSheets": {
      const op = (p.operation as string) ?? "";
      if (op === "append" || op === "appendOrUpdate")
        return "Saves the information as a new row in your Google Sheet";
      if (op === "read" || op === "getAll" || op === "get")
        return "Reads existing data from your Google Sheet";
      if (op === "update") return "Updates an existing entry in your Google Sheet";
      if (op === "lookup") return "Searches your Google Sheet for matching data";
      if (op === "delete") return "Removes a row from your Google Sheet";
      return "Works with data in your Google Sheet";
    }

    // Gmail / Email
    case "gmail": {
      const op = (p.operation as string) ?? "";
      if (op === "send" || op === "sendEmail" || !op) return "Sends an email via Gmail";
      if (op === "get" || op === "getAll") return "Reads emails from Gmail";
      return "Works with Gmail";
    }

    // Logic
    case "if":
      return "Checks a condition and splits into two different paths — one if the answer is yes, one if no";
    case "switch":
      return "Routes the automation down different paths depending on a value";
    case "filter":
      return "Filters out items that don't meet the criteria, only keeping the ones that do";
    case "merge":
      return "Combines data coming from two different paths before continuing";

    // HTTP / External
    case "httpRequest": {
      const url = (p.url as string) ?? "";
      if (url.includes("vapi") || name.toLowerCase().includes("call") || name.toLowerCase().includes("phone"))
        return "Triggers an automated phone call through the AI calling system";
      if (url.includes("shopify")) return "Sends a request to Shopify";
      return "Sends a request to an external service";
    }

    // AI
    case "openAi":
    case "lmOpenAi":
    case "openAiChat":
      return "Uses OpenAI to generate or analyze text";
    case "anthropic":
    case "lmChatAnthropic":
      return "Uses Claude AI to write or analyze text";
    case "agent":
    case "lmAgent":
      return "An AI agent that thinks through a task and takes actions to complete it";

    // Data handling
    case "code":
      return "Runs a custom calculation or data transformation in the background";
    case "set":
    case "editFields":
      return "Organizes and prepares the data before sending it to the next step";
    case "splitInBatches":
      return "Processes the data in smaller groups so nothing gets overloaded";
    case "removeDuplicates":
      return "Removes any duplicate entries from the data";

    // Communication
    case "slack":
      return "Sends a message to a Slack channel or person";
    case "twilio":
      return "Sends an SMS text message";
    case "sendEmail":
    case "emailSend":
      return "Sends an email notification";

    // Shopify
    case "shopify": {
      const op = (p.operation as string) ?? "";
      if (op === "create") return "Creates a new item in Shopify (like a blog post or product)";
      if (op === "update") return "Updates an existing item in Shopify";
      if (op === "get" || op === "getAll") return "Retrieves data from Shopify";
      return "Works with your Shopify store";
    }

    // Flow control
    case "wait":
      return "Pauses the automation and waits for a response or a set amount of time before continuing";
    case "respondToWebhook":
      return "Sends the final response and completes this run of the automation";
    case "noOp":
    case "noop":
      return "A placeholder step — does nothing but keep the flow moving";

    default:
      return name || type;
  }
}

// ─── Build timeline from workflow JSON ────────────────────────────────────────

function buildTimeline(workflow: Record<string, unknown>): TimelineStep[] {
  const allNodes = (workflow.nodes as N8NNode[]) ?? [];
  const nodes = allNodes.filter((n) => !n.type.includes("stickyNote"));

  if (nodes.length === 0) return [];

  const connections = (
    workflow.connections as Record<
      string,
      { main?: Array<Array<{ node: string }>> }
    >
  ) ?? {};

  const nodesByName = Object.fromEntries(nodes.map((n) => [n.name, n]));

  // Find nodes that have at least one incoming connection
  const hasIncoming = new Set<string>();
  for (const nodeConns of Object.values(connections)) {
    for (const outputPort of nodeConns.main ?? []) {
      for (const conn of outputPort) {
        hasIncoming.add(conn.node);
      }
    }
  }

  // Start nodes: triggers (no incoming connections)
  const startNodes = nodes.filter((n) => !hasIncoming.has(n.name));
  const seed = startNodes.length > 0 ? startNodes : nodes.slice(0, 1);

  const visited = new Set<string>();

  function walk(nodeName: string): TimelineStep[] {
    if (visited.has(nodeName) || !nodesByName[nodeName]) return [];
    visited.add(nodeName);

    const node = nodesByName[nodeName];
    const desc = describeNode(node);
    if (!desc) return []; // skip sticky notes

    const outputs = connections[nodeName]?.main ?? [];

    const step: TimelineStep = {
      id: node.id,
      name: node.name,
      description: desc,
      isBranchPoint: outputs.length > 1,
    };

    if (outputs.length === 0) {
      return [step];
    } else if (outputs.length === 1) {
      const nexts = outputs[0].map((c) => c.node);
      const rest = nexts.flatMap((name) => walk(name));
      return [step, ...rest];
    } else {
      // Branch point (IF / Switch)
      const isIfNode = node.type.includes(".if");
      step.branches = outputs.map((branch, i) => ({
        label: isIfNode ? (i === 0 ? "✅ If YES" : "❌ If NO") : `Path ${i + 1}`,
        steps: branch.flatMap((c) => walk(c.node)),
      }));
      return [step];
    }
  }

  return seed.flatMap((n) => walk(n.name));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const workflow = await getWorkflowDetail(id);
    const timeline = buildTimeline(workflow);
    return NextResponse.json({ success: true, timeline });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load" },
      { status: 500 }
    );
  }
}
