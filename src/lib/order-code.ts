import { db, schema } from "@/db";
import { like } from "drizzle-orm";

export async function nextOrderCode(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `TGS-${yy}${mm}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db
      .select({ code: schema.orders.code })
      .from(schema.orders)
      .where(like(schema.orders.code, `${prefix}%`));

    const maxSeq = existing.reduce((max, row) => {
      const seq = parseInt(row.code.slice(prefix.length), 10);
      return Number.isFinite(seq) && seq > max ? seq : max;
    }, 0);

    const candidate = `${prefix}${String(maxSeq + 1 + attempt).padStart(4, "0")}`;
    return candidate;
  }
  throw new Error("Unable to generate unique order code");
}
