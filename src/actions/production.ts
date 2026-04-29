"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

export async function advanceStage(stageId: number) {
  await requirePerm("stage:advance");
  const [stage] = await db
    .select()
    .from(schema.productionStages)
    .where(eq(schema.productionStages.id, stageId));
  if (!stage) return;

  const userId = await getCurrentUserId();

  if (stage.status === "pending") {
    await db
      .update(schema.productionStages)
      .set({ status: "active", startedAt: new Date().toISOString() })
      .where(eq(schema.productionStages.id, stageId));
    await logAction({
      userId,
      action: "stage_advanced",
      entity: "production_stage",
      entityId: stageId,
      details: { to: "active", stage: stage.stage, orderId: stage.orderId },
    });
  } else if (stage.status === "active") {
    await db
      .update(schema.productionStages)
      .set({ status: "done", completedAt: new Date().toISOString() })
      .where(eq(schema.productionStages.id, stageId));

    const allStages = await db
      .select()
      .from(schema.productionStages)
      .where(eq(schema.productionStages.orderId, stage.orderId));

    const nextPending = allStages
      .sort((a, b) => a.id - b.id)
      .find((s) => s.status === "pending");

    if (nextPending) {
      await db
        .update(schema.productionStages)
        .set({ status: "active", startedAt: new Date().toISOString() })
        .where(eq(schema.productionStages.id, nextPending.id));
    } else {
      await db
        .update(schema.orders)
        .set({ status: "ready", updatedAt: new Date().toISOString() })
        .where(eq(schema.orders.id, stage.orderId));
    }

    await logAction({
      userId,
      action: "stage_advanced",
      entity: "production_stage",
      entityId: stageId,
      details: {
        to: "done",
        stage: stage.stage,
        orderId: stage.orderId,
        nextStage: nextPending?.stage,
      },
    });
  }

  revalidatePath("/production");
  revalidatePath(`/orders/${stage.orderId}`);
  revalidatePath("/");
}

export async function revertStage(stageId: number) {
  await requirePerm("stage:advance");
  const [stage] = await db
    .select()
    .from(schema.productionStages)
    .where(eq(schema.productionStages.id, stageId));
  if (!stage) return;

  const userId = await getCurrentUserId();

  const allStages = await db
    .select()
    .from(schema.productionStages)
    .where(eq(schema.productionStages.orderId, stage.orderId));
  const sorted = allStages.sort((a, b) => a.id - b.id);
  const idx = sorted.findIndex((s) => s.id === stageId);
  if (idx <= 0) return; // first stage — can't revert

  const previous = sorted[idx - 1];
  const nowIso = new Date().toISOString();

  // current stage → pending (reset start/complete)
  await db
    .update(schema.productionStages)
    .set({
      status: "pending",
      startedAt: null,
      completedAt: null,
    })
    .where(eq(schema.productionStages.id, stage.id));

  // previous stage → active (clear completedAt, keep startedAt or refresh)
  await db
    .update(schema.productionStages)
    .set({
      status: "active",
      startedAt: nowIso,
      completedAt: null,
    })
    .where(eq(schema.productionStages.id, previous.id));

  // if order had moved to "ready" because all stages were done,
  // revert order status back to in_production
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, stage.orderId));
  if (order && order.status === "ready") {
    await db
      .update(schema.orders)
      .set({ status: "in_production", updatedAt: nowIso })
      .where(eq(schema.orders.id, order.id));
  }

  await logAction({
    userId,
    action: "stage_reverted",
    entity: "production_stage",
    entityId: stageId,
    details: {
      orderId: stage.orderId,
      from: stage.stage,
      to: previous.stage,
    },
  });

  revalidatePath("/production");
  revalidatePath(`/orders/${stage.orderId}`);
  revalidatePath("/");
  revalidatePath("/orders");
}

export async function assignStage(stageId: number, userIdAssigned: number | null) {
  await requirePerm("stage:assign");
  const [stage] = await db
    .select()
    .from(schema.productionStages)
    .where(eq(schema.productionStages.id, stageId));
  if (!stage) return;

  const actorId = await getCurrentUserId();

  await db
    .update(schema.productionStages)
    .set({ assignedTo: userIdAssigned })
    .where(eq(schema.productionStages.id, stageId));

  await logAction({
    userId: actorId,
    action: "stage_assigned",
    entity: "production_stage",
    entityId: stageId,
    details: { assignedTo: userIdAssigned, stage: stage.stage },
  });

  revalidatePath("/production");
  revalidatePath(`/orders/${stage.orderId}`);
}
