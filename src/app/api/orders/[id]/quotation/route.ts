import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { renderQuotationPDF } from "@/lib/pdf/render";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const pdf = await renderQuotationPDF(id);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quotation-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "render failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
