import { NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

const DOC_ID = "15b5A_CJPNcsQVcEgB8mloBGz-mKiSH01uifc3u1MMfg";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
    ],
  });
}

function getSectionIcon(title: string): string {
  const t = title.toUpperCase();
  if (t.includes("EXECUTIVE")) return "📊";
  if (t.includes("VOICE") || t.includes("CUSTOMER")) return "💬";
  if (t.includes("JOBS") || t.includes("JTBD")) return "✅";
  if (t.includes("PAIN")) return "🔴";
  if (t.includes("OBJECTION")) return "🛡️";
  if (t.includes("TRIGGER") || t.includes("CONVERSION")) return "⚡";
  if (t.includes("PERSONA")) return "👥";
  if (t.includes("COMPETITIVE") || t.includes("INTELLIGENCE")) return "🔍";
  if (t.includes("PRICE") || t.includes("SENSITIVITY")) return "💰";
  if (t.includes("TREND")) return "📈";
  if (t.includes("STRATEGIC") || t.includes("RECOMMENDATION")) return "🎯";
  return "📄";
}

function getPreview(text: string): string {
  const cleaned = text.replace(/\n+/g, " ").trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  const preview = sentences.slice(0, 2).join(" ").trim();
  if (preview) return preview;
  return cleaned.substring(0, 160).trim() + (cleaned.length > 160 ? "…" : "");
}

// Walk Google Docs API body.content and extract plain text
interface DocElement {
  paragraph?: {
    elements?: Array<{ textRun?: { content?: string } }>;
  };
  table?: {
    tableRows?: Array<{
      tableCells?: Array<{
        content?: DocElement[];
      }>;
    }>;
  };
}

function extractText(content: DocElement[]): string {
  let text = "";
  for (const element of content) {
    if (element.paragraph) {
      for (const pe of element.paragraph.elements || []) {
        text += pe.textRun?.content || "";
      }
    } else if (element.table) {
      for (const row of element.table.tableRows || []) {
        for (const cell of row.tableCells || []) {
          text += extractText(cell.content || []);
        }
      }
    }
  }
  return text;
}

export async function GET() {
  const auth = getAuth();
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Google credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const docs = google.docs({ version: "v1", auth });
    const res = await docs.documents.get({
      documentId: DOC_ID,
      fields: "body.content",
    });

    const bodyContent = res.data.body?.content as DocElement[] | undefined;
    if (!bodyContent) {
      return NextResponse.json({ success: true, month: "", sections: [] });
    }

    const rawText = extractText(bodyContent);

    // Extract month from ===== header =====
    const monthMatch = rawText.match(/={5}\s*(.+?)\s*={5}/);
    const month = monthMatch
      ? monthMatch[1].replace(/consumer insights report/i, "").trim()
      : "";

    // Remove the ===== title header, then parse === SECTION === headers
    const withoutTitle = rawText.replace(/={5}[\s\S]*?={5}/, "").trim();

    // Find all === SECTION === positions
    const headerRegex = /===\s*([^=\n]+?)\s*===/g;
    const headers: { title: string; index: number; endIndex: number }[] = [];
    let match;
    while ((match = headerRegex.exec(withoutTitle)) !== null) {
      headers.push({
        title: match[1].trim(),
        index: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // Extract content between headers
    const sections = headers.map((header, i) => {
      const contentStart = header.endIndex;
      const contentEnd = i + 1 < headers.length ? headers[i + 1].index : withoutTitle.length;
      const content = withoutTitle.substring(contentStart, contentEnd).trim();
      return {
        title: header.title,
        preview: getPreview(content),
        content,
        icon: getSectionIcon(header.title),
      };
    });

    return NextResponse.json({ success: true, month, sections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
