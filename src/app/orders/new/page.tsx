import { db, schema } from "@/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import NewOrderForm from "./form";
import { getCurrentUser } from "@/lib/auth";

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  const isDealer = user?.role === "dealer";

  const [customers, dealers, dealerPrices, graphicUsers] = await Promise.all([
    db
      .select({
        id: schema.customers.id,
        name: schema.customers.name,
        tier: schema.customers.tier,
        freeShipping: schema.customers.freeShipping,
        defaultDiscountPct: schema.customers.defaultDiscountPct,
      })
      .from(schema.customers)
      .orderBy(desc(schema.customers.createdAt)),
    isDealer
      ? Promise.resolve([])
      : db
          .select({
            id: schema.dealers.id,
            name: schema.dealers.name,
            discountPct: schema.dealers.discountPct,
            commissionPct: schema.dealers.commissionPct,
          })
          .from(schema.dealers)
          .where(eq(schema.dealers.active, true))
          .orderBy(asc(schema.dealers.name)),
    isDealer && user?.dealerId
      ? db
          .select({
            dealerId: schema.dealerPrices.dealerId,
            garmentType: schema.dealerPrices.garmentType,
            minQty: schema.dealerPrices.minQty,
            price: schema.dealerPrices.price,
          })
          .from(schema.dealerPrices)
          .where(eq(schema.dealerPrices.dealerId, user.dealerId))
      : db
          .select({
            dealerId: schema.dealerPrices.dealerId,
            garmentType: schema.dealerPrices.garmentType,
            minQty: schema.dealerPrices.minQty,
            price: schema.dealerPrices.price,
          })
          .from(schema.dealerPrices),
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
      })
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
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <Link
          href="/orders"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← ออเดอร์ทั้งหมด
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">รับออเดอร์ใหม่</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isDealer
            ? "ออเดอร์นี้จะถูกระบุว่ามาจากตัวแทนของคุณอัตโนมัติ"
            : "เลือกลูกค้าและกรอกรายละเอียด"}
        </p>
      </header>

      <NewOrderForm
        customers={customers}
        dealers={dealers}
        isDealer={isDealer}
        dealerPrices={dealerPrices}
        currentDealerId={user?.dealerId ?? null}
        graphicUsers={graphicUsers}
      />
    </div>
  );
}
