import { db, schema } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { productionStageEnum } from "@/db/schema";
import { stageLabels, formatDateTH } from "@/lib/format";
import { advanceStage, revertStage } from "@/actions/production";
import AssignSelect from "./assign-select";
import {
  Palette,
  Printer,
  Flame,
  Scissors,
  Shirt,
  ShieldCheck,
  Package,
  Truck,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Clock,
  UserCircle2,
  Paperclip,
  ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STAGE_ROLE: Record<(typeof productionStageEnum)[number], string[]> = {
  graphic: ["graphic", "manager", "owner"],
  print: ["print", "manager", "owner"],
  roll: ["roll", "manager", "owner"],
  laser: ["laser", "manager", "owner"],
  sew: ["sew", "manager", "owner"],
  qc: ["qc", "manager", "owner"],
  pack: ["sew", "qc", "manager", "owner", "admin"],
  ship: ["admin", "manager", "owner"],
};

type StageKey = (typeof productionStageEnum)[number];

const stageIcon: Record<StageKey, LucideIcon> = {
  graphic: Palette,
  print: Printer,
  roll: Flame,
  laser: Scissors,
  sew: Shirt,
  qc: ShieldCheck,
  pack: Package,
  ship: Truck,
};

const stageHint: Record<StageKey, string> = {
  graphic: "ออกแบบลาย / เตรียมไฟล์",
  print: "พิมพ์ sublimation บนกระดาษ",
  roll: "รีดโรลลงเนื้อผ้า",
  laser: "ตัดแพทเทิร์นด้วยเลเซอร์",
  sew: "เย็บประกอบเสื้อ",
  qc: "รีดเรียบ + ตรวจคุณภาพ",
  pack: "พับ ใส่ถุง แพ็คเตรียมส่ง",
  ship: "นัดส่ง / มารับเอง",
};

const stageTone: Record<
  StageKey,
  { icon: string; dot: string; bar: string }
> = {
  graphic: {
    icon: "bg-pink-50 text-pink-600",
    dot: "bg-pink-500",
    bar: "from-pink-400 to-pink-500",
  },
  print: {
    icon: "bg-sky-50 text-sky-600",
    dot: "bg-sky-500",
    bar: "from-sky-400 to-sky-500",
  },
  roll: {
    icon: "bg-orange-50 text-orange-600",
    dot: "bg-orange-500",
    bar: "from-orange-400 to-orange-500",
  },
  laser: {
    icon: "bg-indigo-50 text-indigo-600",
    dot: "bg-indigo-500",
    bar: "from-indigo-400 to-indigo-500",
  },
  sew: {
    icon: "bg-teal-50 text-teal-600",
    dot: "bg-teal-500",
    bar: "from-teal-400 to-teal-500",
  },
  qc: {
    icon: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
    bar: "from-emerald-400 to-emerald-500",
  },
  pack: {
    icon: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    bar: "from-amber-400 to-amber-500",
  },
  ship: {
    icon: "bg-zinc-100 text-ink-900",
    dot: "bg-ink-900",
    bar: "from-ink-700 to-ink-900",
  },
};

function deadlineStatus(deadline: string | null): {
  tone: "overdue" | "soon" | "ok" | "none";
  label: string;
} {
  if (!deadline) return { tone: "none", label: "ไม่ระบุ" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { tone: "overdue", label: `เลย ${-diff} วัน` };
  if (diff === 0) return { tone: "soon", label: "วันนี้" };
  if (diff <= 3) return { tone: "soon", label: `อีก ${diff} วัน` };
  return { tone: "ok", label: formatDateTH(deadline) };
}

function timeInStage(startedAt: string | null): string | null {
  if (!startedAt) return null;
  const start = new Date(startedAt);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - start.getTime()) / 3_600_000);
  if (diffH < 1) return "เริ่มเมื่อครู่";
  if (diffH < 24) return `${diffH} ชม. ที่แล้ว`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} วันที่แล้ว`;
}

export default async function ProductionPage() {
  const [stages, users, orderFileRows, designRows] = await Promise.all([
    db
      .select({
        id: schema.productionStages.id,
        orderId: schema.productionStages.orderId,
        stage: schema.productionStages.stage,
        status: schema.productionStages.status,
        startedAt: schema.productionStages.startedAt,
        assignedTo: schema.productionStages.assignedTo,
        assignedName: schema.users.name,
        orderCode: schema.orders.code,
        orderStatus: schema.orders.status,
        deadline: schema.orders.deadline,
        customerName: schema.customers.name,
      })
      .from(schema.productionStages)
      .leftJoin(
        schema.orders,
        eq(schema.productionStages.orderId, schema.orders.id)
      )
      .leftJoin(
        schema.customers,
        eq(schema.orders.customerId, schema.customers.id)
      )
      .leftJoin(
        schema.users,
        eq(schema.productionStages.assignedTo, schema.users.id)
      ),
    db.select().from(schema.users),
    // Image attachments per order (rough — we'll filter to active orders below)
    db
      .select({
        orderId: schema.orderFiles.orderId,
        fileUrl: schema.orderFiles.fileUrl,
        fileName: schema.orderFiles.fileName,
        mimeType: schema.orderFiles.mimeType,
        createdAt: schema.orderFiles.createdAt,
      })
      .from(schema.orderFiles)
      .where(sql`${schema.orderFiles.mimeType} like 'image/%'`)
      .orderBy(desc(schema.orderFiles.createdAt)),
    // Designs with a file URL — newest version first per order
    db
      .select({
        orderId: schema.designs.orderId,
        fileUrl: schema.designs.fileUrl,
        version: schema.designs.version,
        status: schema.designs.status,
      })
      .from(schema.designs)
      .where(sql`${schema.designs.fileUrl} is not null`)
      .orderBy(desc(schema.designs.version)),
  ]);

  // Build a per-order image list. Approved/pending designs come first
  // (cleanest reference for floor staff), then customer-supplied
  // attachments, deduped by URL.
  const imagesByOrder = new Map<number, { url: string; label: string }[]>();
  function addImage(
    orderId: number,
    url: string | null,
    label: string
  ) {
    if (!url) return;
    const arr = imagesByOrder.get(orderId) ?? [];
    if (arr.some((x) => x.url === url)) return;
    arr.push({ url, label });
    imagesByOrder.set(orderId, arr);
  }
  for (const d of designRows) {
    addImage(
      d.orderId,
      d.fileUrl,
      `ดีไซน์ v${d.version}${d.status === "approved" ? " (อนุมัติ)" : ""}`
    );
  }
  for (const f of orderFileRows) {
    addImage(f.orderId, f.fileUrl, f.fileName ?? "รูปแนบ");
  }

  const byStage = Object.fromEntries(
    productionStageEnum.map((s) => [s, [] as typeof stages])
  ) as Record<StageKey, typeof stages>;

  for (const s of stages) {
    if (s.status === "active" && s.orderStatus !== "cancelled") {
      byStage[s.stage].push(s);
    }
  }

  const totalActive = productionStageEnum.reduce(
    (n, k) => n + byStage[k].length,
    0
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 tracking-tight">
            การผลิต
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            บอร์ดสายการผลิต 8 สเตจ — กด{" "}
            <span className="font-medium text-ink-900">เสร็จสเตจนี้</span>{" "}
            เพื่อส่งต่อให้สเตจถัดไป
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            กำลังทำ {totalActive} งาน
          </span>
        </div>
      </header>

      {/* Trello-style horizontal kanban: scroll right to see more stages.
          Each column has a fixed width so cards inside can show large
          cover images without cramming. */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-8 md:px-8">
        {productionStageEnum.map((stageKey) => {
          const Icon = stageIcon[stageKey];
          const tone = stageTone[stageKey];
          const eligibleUsers = users.filter((u) =>
            STAGE_ROLE[stageKey].includes(u.role)
          );
          const items = byStage[stageKey];

          return (
            <div
              key={stageKey}
              className="card overflow-hidden flex flex-col min-h-[28rem] flex-shrink-0 w-72"
            >
              <div
                className={`h-1 bg-gradient-to-r ${tone.bar}`}
                aria-hidden
              />
              <div className="px-4 pt-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone.icon}`}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-ink-900">
                        {stageLabels[stageKey]}
                      </p>
                      <span className="text-xs font-medium text-zinc-500 tabular-nums">
                        {items.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-tight truncate">
                      {stageHint[stageKey]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-2.5 space-y-2 bg-zinc-50/40">
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-white border border-dashed border-zinc-200 flex items-center justify-center mb-2">
                      <span className={`w-2 h-2 rounded-full ${tone.dot} opacity-40`} />
                    </div>
                    <p className="text-xs text-zinc-400">ว่าง</p>
                  </div>
                )}
                {items.map((s) => {
                  const dl = deadlineStatus(s.deadline);
                  const elapsed = timeInStage(s.startedAt);
                  const images = imagesByOrder.get(s.orderId) ?? [];
                  const cover = images[0];
                  const attachCount = images.length;
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all overflow-hidden"
                    >
                      {/* Cover image — Trello style. Full width of the
                          card, large square aspect for clear references. */}
                      {cover ? (
                        <a
                          href={cover.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={cover.label}
                          className="block bg-zinc-100 aspect-square overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cover.url}
                            alt={cover.label}
                            loading="lazy"
                            className="w-full h-full object-cover hover:scale-[1.02] transition-transform"
                          />
                        </a>
                      ) : (
                        <Link
                          href={`/orders/${s.orderId}`}
                          className="block bg-zinc-50 aspect-square flex items-center justify-center text-zinc-300 border-b border-zinc-100 hover:bg-zinc-100 transition-colors"
                          title="ยังไม่มีรูป — กดเพื่อเปิดออเดอร์"
                        >
                          <ImageIcon size={32} strokeWidth={1.5} />
                        </Link>
                      )}

                      <div className="px-3 pt-2.5 pb-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Link
                            href={`/orders/${s.orderId}`}
                            className="font-mono text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                          >
                            {s.orderCode}
                          </Link>
                          {dl.tone === "overdue" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                              <AlertTriangle size={10} strokeWidth={2.5} />
                              {dl.label}
                            </span>
                          )}
                          {dl.tone === "soon" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              <Clock size={10} strokeWidth={2.5} />
                              {dl.label}
                            </span>
                          )}
                          {dl.tone === "ok" && (
                            <span className="text-[10px] text-zinc-500">
                              {dl.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-ink-900 leading-snug">
                          {s.customerName ?? "-"}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {elapsed && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
                              <Clock size={10} strokeWidth={2} />
                              {elapsed}
                            </span>
                          )}
                          {attachCount > 0 && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-zinc-500"
                              title={`รูป/ไฟล์แนบทั้งหมด ${attachCount}`}
                            >
                              <Paperclip size={10} strokeWidth={2} />
                              {attachCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-3 pb-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <UserCircle2
                            size={14}
                            className="text-zinc-400 flex-shrink-0"
                          />
                          <div className="flex-1">
                            <AssignSelect
                              stageId={s.id}
                              currentUserId={s.assignedTo ?? null}
                              users={eligibleUsers.map((u) => ({
                                id: u.id,
                                name: u.name,
                              }))}
                            />
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          {stageKey !== productionStageEnum[0] && (
                            <form
                              action={async () => {
                                "use server";
                                await revertStage(s.id);
                              }}
                              className="flex-shrink-0"
                            >
                              <button
                                type="submit"
                                className="btn btn-outline btn-xs"
                                title="ส่งกลับสเตจก่อนหน้า"
                                aria-label="ส่งกลับ"
                              >
                                <ArrowLeft size={12} strokeWidth={2.5} />
                              </button>
                            </form>
                          )}
                          <form
                            action={async () => {
                              "use server";
                              await advanceStage(s.id);
                            }}
                            className="flex-1"
                          >
                            <button
                              type="submit"
                              className="btn btn-brand btn-xs w-full group"
                            >
                              เสร็จสเตจนี้
                              <ArrowRight
                                size={12}
                                strokeWidth={2.5}
                                className="transition-transform group-hover:translate-x-0.5"
                              />
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
