import { google } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export interface SheetRow {
  [key: string]: string;
}

export async function getSheetData(
  sheetId: string,
  range: string = "Sheet1"
): Promise<SheetRow[]> {
  const auth = getAuth();
  if (!auth) {
    return [];
  }

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((header: string, i: number) => {
      obj[header] = row[i] || "";
    });
    return obj;
  });
}

export async function getCustomerData(): Promise<SheetRow[]> {
  const sheetId = process.env.CUSTOMER_SHEET_ID!;
  return getSheetData(sheetId);
}

export async function getContentData(): Promise<SheetRow[]> {
  const sheetId = process.env.CONTENT_SHEET_ID!;
  return getSheetData(sheetId);
}
