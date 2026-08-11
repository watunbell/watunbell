import { NextResponse } from "next/server";
import { isSheetsConfigured, returnLoan } from "@/lib/googleSheets";
import { requireAllowedUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

/**
 * PATCH marks a loan as returned (the only mutation on an existing loan).
 * Body: `{ "action": "return" }`.
 */
export async function PATCH(request: Request, { params }: Params) {
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
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
    };
    if (body.action && body.action !== "return") {
      return NextResponse.json(
        { error: `Unsupported action: ${body.action}` },
        { status: 400 },
      );
    }
    const loan = await returnLoan(params.id, email);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found." }, { status: 404 });
    }
    return NextResponse.json({ loan });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to return loan." },
      { status: 500 },
    );
  }
}
