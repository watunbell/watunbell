import { NextResponse } from "next/server";
import {
  createLoan,
  isSheetsConfigured,
  listLoans,
} from "@/lib/googleSheets";
import { requireAllowedUser } from "@/lib/apiAuth";
import type { LoanInput } from "@/lib/types";

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
    const loans = await listLoans();
    return NextResponse.json({ loans });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load loans." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const email = await requireAllowedUser();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSheetsConfigured()) {
    return NextResponse.json(
      { error: "Google Sheets is not configured on the server." },
      { status: 503 },
    );
  }
  try {
    const input = (await request.json()) as LoanInput;
    if (!input?.itemId || !input?.borrower?.trim()) {
      return NextResponse.json(
        { error: "itemId and borrower are required." },
        { status: 400 },
      );
    }
    const loan = await createLoan(input, email);
    return NextResponse.json({ loan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record loan." },
      { status: 500 },
    );
  }
}
