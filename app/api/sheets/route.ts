import { NextRequest, NextResponse } from "next/server";
import { getCustomerData, getContentData } from "@/app/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sheet = request.nextUrl.searchParams.get("sheet");

  try {
    if (sheet === "customers") {
      const data = await getCustomerData();
      return NextResponse.json({ success: true, data });
    } else if (sheet === "content") {
      const data = await getContentData();
      return NextResponse.json({ success: true, data });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid sheet parameter. Use ?sheet=customers or ?sheet=content" },
        { status: 400 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
