import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  getWorkflows,
  getWorkflowDetail,
  toggleWorkflow,
  createSafeCopy,
  restoreOriginal,
  WORKFLOW_META,
} from "@/app/lib/n8n";

export const dynamic = "force-dynamic";

type Provider = "anthropic" | "openai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOL_DESCRIPTIONS = {
  get_workflows: "Get the current status and recent performance of all 4 Nira Pet workflows.",
  get_workflow_detail:
    "Get the full technical details of a specific workflow — needed before making any changes.",
  toggle_workflow: "Turn a workflow on (running) or off.",
  create_safe_copy:
    "Safely edit a workflow: deactivates the original (kept as backup), creates a modified copy, and turns the copy on. Use for ALL edits.",
  restore_original:
    "Roll back an edit by turning off the modified copy and turning the original back on.",
};

// Anthropic tool format
const ANTHROPIC_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_workflows",
    description: TOOL_DESCRIPTIONS.get_workflows,
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_workflow_detail",
    description: TOOL_DESCRIPTIONS.get_workflow_detail,
    input_schema: {
      type: "object" as const,
      properties: {
        workflow_id: { type: "string", description: "The workflow ID" },
      },
      required: ["workflow_id"],
    },
  },
  {
    name: "toggle_workflow",
    description: TOOL_DESCRIPTIONS.toggle_workflow,
    input_schema: {
      type: "object" as const,
      properties: {
        workflow_id: { type: "string" },
        action: { type: "string", enum: ["activate", "deactivate"] },
      },
      required: ["workflow_id", "action"],
    },
  },
  {
    name: "create_safe_copy",
    description: TOOL_DESCRIPTIONS.create_safe_copy,
    input_schema: {
      type: "object" as const,
      properties: {
        original_id: { type: "string" },
        modified_workflow: { type: "object" },
        change_summary: { type: "string", description: "Plain English description of what changed" },
      },
      required: ["original_id", "modified_workflow", "change_summary"],
    },
  },
  {
    name: "restore_original",
    description: TOOL_DESCRIPTIONS.restore_original,
    input_schema: {
      type: "object" as const,
      properties: {
        original_id: { type: "string" },
        modified_copy_id: { type: "string" },
      },
      required: ["original_id", "modified_copy_id"],
    },
  },
];

// OpenAI tool format
const OPENAI_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_workflows",
      description: TOOL_DESCRIPTIONS.get_workflows,
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workflow_detail",
      description: TOOL_DESCRIPTIONS.get_workflow_detail,
      parameters: {
        type: "object",
        properties: { workflow_id: { type: "string" } },
        required: ["workflow_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_workflow",
      description: TOOL_DESCRIPTIONS.toggle_workflow,
      parameters: {
        type: "object",
        properties: {
          workflow_id: { type: "string" },
          action: { type: "string", enum: ["activate", "deactivate"] },
        },
        required: ["workflow_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_safe_copy",
      description: TOOL_DESCRIPTIONS.create_safe_copy,
      parameters: {
        type: "object",
        properties: {
          original_id: { type: "string" },
          modified_workflow: { type: "object" },
          change_summary: { type: "string" },
        },
        required: ["original_id", "modified_workflow", "change_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restore_original",
      description: TOOL_DESCRIPTIONS.restore_original,
      parameters: {
        type: "object",
        properties: {
          original_id: { type: "string" },
          modified_copy_id: { type: "string" },
        },
        required: ["original_id", "modified_copy_id"],
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_workflows": {
        const workflows = await getWorkflows();
        return JSON.stringify(
          workflows.map((wf) => ({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            active: wf.active,
            totalRuns: wf.stats.total,
            successRate: wf.stats.successRate,
            errors: wf.stats.error,
            lastRun: wf.stats.lastRun,
          }))
        );
      }
      case "get_workflow_detail": {
        const detail = await getWorkflowDetail(input.workflow_id as string);
        return JSON.stringify(detail);
      }
      case "toggle_workflow": {
        const activate = input.action === "activate";
        await toggleWorkflow(input.workflow_id as string, activate);
        const wfName = WORKFLOW_META[input.workflow_id as string]?.name ?? input.workflow_id;
        return JSON.stringify({
          success: true,
          message: `${wfName} has been turned ${activate ? "on" : "off"}.`,
        });
      }
      case "create_safe_copy": {
        const result = await createSafeCopy(
          input.original_id as string,
          input.modified_workflow as Record<string, unknown>,
          input.change_summary as string
        );
        return JSON.stringify({ success: true, ...result });
      }
      case "restore_original": {
        await restoreOriginal(
          input.original_id as string,
          input.modified_copy_id as string
        );
        return JSON.stringify({ success: true, message: "Original workflow restored." });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "Tool failed" });
  }
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI automation assistant built into the Nira Pet dashboard. Nira Pet is a dog supplement company. You help the business owner understand and control their 4 automated workflows.

The 4 workflows you manage:
- New Customer (ID: LGzQHIALne_MHAHWtdBIQ): Captures new Shopify customers and saves them to a tracking sheet
- AI Voice Agent (ID: u4sSYc8PDieJxX_g6VMWl): Automatically calls new customers by phone to welcome them and gather feedback
- Purchases (ID: ETQm3I9t8ypv6V7eYAVyv): Tracks every Shopify order and updates customer purchase history
- Blog Creator (ID: lO1Z5m781nQe3HsPYUTch): Automatically writes and publishes a new SEO blog post to the Shopify store every day

HARD RESTRICTIONS — never break these:
1. You cannot create brand-new automations — only manage or edit the existing 4.
2. For ANY edit to a workflow, you MUST use create_safe_copy — never edit the original directly. This keeps the original as a backup so changes can be undone.
3. If asked to undo a change, use restore_original.

HOW TO COMMUNICATE — very important:
- Write as if talking to someone who has never used software like n8n or automation tools
- Never use these words: node, webhook, API, JSON, trigger, instance, execute, payload, schema
- Instead use: "step" (not node), "connection" (not webhook), "ran" (not executed/triggered), "turned on/off" (not active/inactive)
- Keep responses to 2-4 sentences. Be direct and friendly.
- When you make a change, confirm it in plain English (e.g. "Done — the Blog Creator is now turned off.")
- When something fails, explain it simply without technical details`;

// ─── Anthropic handler ────────────────────────────────────────────────────────

async function runWithAnthropic(messages: ChatMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: ANTHROPIC_TOOLS,
    messages: anthropicMessages,
  });

  // Tool use loop
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: await executeTool(block.name, block.input as Record<string, unknown>),
      }))
    );

    anthropicMessages.push({ role: "assistant", content: response.content });
    anthropicMessages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: ANTHROPIC_TOOLS,
      messages: anthropicMessages,
    });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlock?.text ?? "Sorry, I couldn't generate a response.";
}

// ─── OpenAI handler ───────────────────────────────────────────────────────────

async function runWithOpenAI(messages: ChatMessage[]): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    tools: OPENAI_TOOLS,
    messages: openaiMessages,
  });

  // Tool use loop
  while (response.choices[0].finish_reason === "tool_calls") {
    const toolCalls = response.choices[0].message.tool_calls ?? [];
    openaiMessages.push(response.choices[0].message);

    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const result = await executeTool(tc.function.name, input);
        return {
          role: "tool" as const,
          tool_call_id: tc.id,
          content: result,
        };
      })
    );

    openaiMessages.push(...toolResults);

    response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      tools: OPENAI_TOOLS,
      messages: openaiMessages,
    });
  }

  return response.choices[0].message.content ?? "Sorry, I couldn't generate a response.";
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages, provider } = (await req.json()) as {
      messages: ChatMessage[];
      provider: Provider;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const reply =
      provider === "openai"
        ? await runWithOpenAI(messages)
        : await runWithAnthropic(messages);

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
