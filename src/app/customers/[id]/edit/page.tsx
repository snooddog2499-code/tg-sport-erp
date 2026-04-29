import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditCustomerForm from "./form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, id));
  if (!customer) notFound();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <Link
          href={`/customers/${id}`}
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← กลับ
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-2">
          แก้ไข {customer.name}
        </h1>
      </header>
      <EditCustomerForm customer={customer} />
    </div>
  );
}
