import Link from "next/link";
import { db, schema } from "@/db";
import { desc, inArray, or, like, type SQL } from "drizzle-orm";
import { formatDateTH } from "@/lib/format";
import CustomerSearchBar from "./search-bar";

const tierColors: Record<string, string> = {
  new: "bg-zinc-100 text-zinc-700",
  regular: "bg-blue-100 text-blue-700",
  vip: "bg-amber-100 text-amber-800",
};

const tierLabels: Record<string, string> = {
  new: "ใหม่",
  regular: "ประจำ",
  vip: "VIP",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  let whereClause: SQL | undefined = undefined;
  if (q.trim()) {
    const trimmed = q.trim();
    const term = `%${trimmed}%`;
    const lower = trimmed.toLowerCase();
    const matchedTiers = (
      Object.entries(tierLabels) as Array<[string, string]>
    )
      .filter(
        ([k, label]) =>
          label.toLowerCase().includes(lower) ||
          k.toLowerCase().includes(lower)
      )
      .map(([k]) => k);

    const conditions: SQL[] = [
      like(schema.customers.name, term)!,
      like(schema.customers.phone, term)!,
      like(schema.customers.lineId, term)!,
      like(schema.customers.email, term)!,
    ];
    if (matchedTiers.length > 0) {
      conditions.push(
        inArray(
          schema.customers.tier,
          matchedTiers as Array<
            (typeof schema.customers.$inferSelect)["tier"]
          >
        )
      );
    }
    whereClause = or(...conditions)!;
  }

  const customers = await db
    .select()
    .from(schema.customers)
    .where(whereClause)
    .orderBy(desc(schema.customers.createdAt));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">สมาชิกโรงงาน</h1>
          <p className="text-sm text-zinc-500 mt-1">{customers.length} ราย</p>
        </div>
        <Link
          href="/customers/new"
          className="btn btn-brand btn-sm"
        >
          + เพิ่มสมาชิก
        </Link>
      </header>

      <CustomerSearchBar initialQ={q} />

      {customers.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center text-sm text-zinc-500">
          {q ? "ไม่พบลูกค้าตามเงื่อนไข" : "ยังไม่มีลูกค้า"}
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-zinc-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">ชื่อ</th>
                  <th className="text-left px-5 py-2 font-medium">เบอร์</th>
                  <th className="text-left px-5 py-2 font-medium">LINE</th>
                  <th className="text-left px-5 py-2 font-medium">ระดับ</th>
                  <th className="text-left px-5 py-2 font-medium">เพิ่มเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{c.phone ?? "-"}</td>
                    <td className="px-5 py-3 text-zinc-600">{c.lineId ?? "-"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tierColors[c.tier]}`}
                      >
                        {tierLabels[c.tier]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">
                      {formatDateTH(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="block bg-white border border-zinc-200 rounded-lg p-3"
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-sm">{c.name}</p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tierColors[c.tier]}`}
                  >
                    {tierLabels[c.tier]}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span>📞 {c.phone ?? "-"}</span>
                  <span>💬 {c.lineId ?? "-"}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
