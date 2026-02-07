import { NextResponse } from "next/server";
import { getWorkflows } from "@/app/lib/n8n";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workflows = await getWorkflows();
    return NextResponse.json({ success: true, data: workflows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
