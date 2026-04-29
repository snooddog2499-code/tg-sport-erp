import { db, schema } from "@/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditOrderForm from "./form";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, id));
  if (!order) notFound();

  const [customers, graphicUsers] = await Promise.all([
    db
      .select({
        id: schema.customers.id,
        name: schema.customers.name,
        tier: schema.customers.tier,
      })
      .from(schema.customers)
      .orderBy(desc(schema.customers.createdAt)),
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(
        and(
          inArray(schema.users.role, ["graphic", "manager", "owner"]),
          eq(schema.users.active, true)
        )
      )
      .orderBy(asc(schema.users.name)),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <Link
          href={`/orders/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← กลับออเดอร์
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">
          แก้ไขออเดอร์ <span className="font-mono">{order.code}</span>
        </h1>
      </header>
      <EditOrderForm
        order={order}
        customers={customers}
        graphicUsers={graphicUsers}
      />
    </div>
  );
}
