import "server-only";
import { db, schema } from "@/db";
import { and, eq, like, sql } from "drizzle-orm";

/**
 * Returns next document number in the form
 *   <PREFIX>-<YYYY>-<MM>-<NNNN>
 * e.g. EXP-2026-05-0001
 *
 * Sequence resets per month per type (separate counters for income/expense).
 */
export async function nextFinanceDocNo(
  type: "income" | "expense",
  date: Date = new Date()
): Promise<string> {
  const prefix = type === "income" ? "INC" : "EXP";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const pattern = `${prefix}-${yyyy}-${mm}-%`;

  const [row] = await db
    .select({
      maxNo: sql<number>`coalesce(max(cast(substring(${schema.financeDocuments.docNo} from '[0-9]+$') as int)), 0)`.mapWith(
        Number
      ),
    })
    .from(schema.financeDocuments)
    .where(
      and(
        eq(schema.financeDocuments.type, type),
        like(schema.financeDocuments.docNo, pattern)
      )
    );

  const next = (row?.maxNo ?? 0) + 1;
  return `${prefix}-${yyyy}-${mm}-${String(next).padStart(4, "0")}`;
}
