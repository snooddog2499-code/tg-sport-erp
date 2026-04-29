import { db, schema } from "@/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { stageLabels } from "@/lib/format";
import { productionStageEnum } from "@/db/schema";
import {
  Palette,
  Printer,
  Flame,
  Scissors,
  Shirt,
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StageKey = (typeof productionStageEnum)[number];

const stageMeta: Record<
  StageKey,
  { icon: LucideIcon; tone: string; bar: string }
> = {
  graphic: { icon: Palette, tone: "text-pink-600", bar: "bg-pink-500" },
  print: { icon: Printer, tone: "text-sky-600", bar: "bg-sky-500" },
  roll: { icon: Flame, tone: "text-orange-600", bar: "bg-orange-500" },
  laser: { icon: Scissors, tone: "text-indigo-600", bar: "bg-indigo-500" },
  sew: { icon: Shirt, tone: "text-teal-600", bar: "bg-teal-500" },
  qc: { icon: ShieldCheck, tone: "text-emerald-600", bar: "bg-emerald-500" },
  pack: { icon: Package, tone: "text-amber-700", bar: "bg-amber-500" },
  ship: { icon: Truck, tone: "text-ink-900", bar: "bg-ink-900" },
};

export default async function PipelineSummary() {
  const [stageRows, statusRows] = await Promise.all([
    db
      .select({
        stage: schema.productionStages.stage,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.productionStages)
      .leftJoin(
        schema.orders,
        eq(schema.productionStages.orderId, schema.orders.id)
      )
      .where(
        and(
          eq(schema.productionStages.status, "active"),
          inArray(schema.orders.status, [
            "received",
            "quoted",
            "approved",
            "in_production",
            "qc",
            "ready",
          ])
        )
      )
      .groupBy(schema.productionStages.stage),
    db
      .select({
        status: schema.orders.status,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(schema.orders)
      .groupBy(schema.orders.status),
  ]);

  const stageCount = new Map<string, number>(
    stageRows.map((r) => [r.stage, r.count])
  );
  const statusCount = new Map<string, number>(
    statusRows.map((r) => [r.status, r.count])
  );

  const completed =
    (statusCount.get("delivered") ?? 0) + (statusCount.get("paid") ?? 0);
  const totalActive = productionStageEnum.reduce(
    (s, k) => s + (stageCount.get(k) ?? 0),
    0
  );

  return (
    <section className="card overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink-900 text-sm">
            สรุปสายการผลิต
          </h2>
          <p className="text-xs text-zinc-500">
            กำลังดำเนินการ {totalActive} ใบ ·
            เสร็จแล้ว {completed} ใบ
          </p>
        </div>
        <Link
          href="/production"
          className="text-xs text-brand-600 hover:underline"
        >
          ไปที่บอร์ดผลิต →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-0 divide-x divide-zinc-100 border-b border-zinc-100">
        {productionStageEnum.map((stage) => {
          const meta = stageMeta[stage];
          const count = stageCount.get(stage) ?? 0;
          return (
            <SummaryCell
              key={stage}
              icon={meta.icon}
              tone={meta.tone}
              bar={meta.bar}
              label={stageLabels[stage]}
              count={count}
            />
          );
        })}
        <SummaryCell
          icon={CheckCircle2}
          tone="text-emerald-600"
          bar="bg-emerald-500"
          label="เสร็จ"
          count={completed}
          href="/orders?q=ส่งแล้ว"
        />
      </div>
    </section>
  );
}

function SummaryCell({
  icon: Icon,
  tone,
  bar,
  label,
  count,
  href,
}: {
  icon: LucideIcon;
  tone: string;
  bar: string;
  label: string;
  count: number;
  href?: string;
}) {
  const inner = (
    <>
      <div className={`h-0.5 ${count > 0 ? bar : "bg-zinc-100"}`} />
      <div className="px-3 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon size={13} className={tone} strokeWidth={2.25} />
          <span className="text-[11px] text-zinc-500 truncate flex-1 min-w-0">
            {label}
          </span>
        </div>
        <p
          className={`text-xl font-bold tabular-nums ${
            count === 0 ? "text-zinc-300" : "text-ink-900"
          }`}
        >
          {count}
        </p>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:bg-zinc-50 transition-colors">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}
