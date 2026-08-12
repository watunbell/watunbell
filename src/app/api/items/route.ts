import { NextResponse } from "next/server";
import {
  createItem,
  isSheetsConfigured,
  listItems,
} from "@/lib/googleSheets";
import { requireAllowedUser } from "@/lib/apiAuth";
import type { InventoryItemInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAllowedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "Google Sheets is not configured on the server." },
      { status: 503 },
    );
  }
  try {
    const items = await listItems();
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load items." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAllowedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "Google Sheets is not configured on the server." },
      { status: 503 },
    );
  }
  try {
    const input = (await request.json()) as InventoryItemInput;
    if (!input?.name || !input?.category || !input?.status) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }
    const item = await createItem(input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create item." },
      { status: 500 },
    );
  }
}
