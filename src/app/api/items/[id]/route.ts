import { NextResponse } from "next/server";
import {
  deleteItem,
  isSheetsConfigured,
  updateItem,
} from "@/lib/googleSheets";
import { requireAllowedUser } from "@/lib/apiAuth";
import type { InventoryItemInput } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Params) {
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
    const changes = (await request.json()) as Partial<InventoryItemInput>;
    const item = await updateItem(params.id, changes);
    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update item." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
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
    const ok = await deleteItem(params.id);
    if (!ok) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete item." },
      { status: 500 },
    );
  }
}
