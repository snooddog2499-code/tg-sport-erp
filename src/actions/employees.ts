"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentUserId } from "@/lib/session";
import { requirePerm } from "@/lib/permissions";

const EmployeeSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  dept: z.string().min(1, "กรุณาเลือกแผนก"),
  salary: z.coerce.number().min(0).default(0),
  salaryType: z.enum(["monthly", "daily", "piece"]).default("monthly"),
  startDate: z.string().optional(),
  userId: z.coerce.number().int().optional(),
});

export type EmployeeFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requirePerm("hr:manage");
  const parsed = EmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getCurrentUserId();
  const [inserted] = await db
    .insert(schema.employees)
    .values({
      name: parsed.data.name,
      dept: parsed.data.dept,
      salary: parsed.data.salary,
      salaryType: parsed.data.salaryType,
      startDate: parsed.data.startDate || null,
      userId: parsed.data.userId || null,
    })
    .returning();

  await logAction({
    userId,
    action: "create",
    entity: "employee",
    entityId: inserted.id,
    details: { name: parsed.data.name, dept: parsed.data.dept },
  });

  revalidatePath("/employees");
  redirect(`/employees/${inserted.id}`);
}

export async function updateEmployee(
  id: number,
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requirePerm("hr:manage");
  const parsed = EmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getCurrentUserId();
  await db
    .update(schema.employees)
    .set({
      name: parsed.data.name,
      dept: parsed.data.dept,
      salary: parsed.data.salary,
      salaryType: parsed.data.salaryType,
      startDate: parsed.data.startDate || null,
      userId: parsed.data.userId || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.employees.id, id));

  await logAction({
    userId,
    action: "update",
    entity: "employee",
    entityId: id,
    details: parsed.data,
  });

  revalidatePath(`/employees/${id}`);
  revalidatePath("/employees");
  redirect(`/employees/${id}`);
}

export async function toggleEmployeeActive(id: number) {
  await requirePerm("hr:manage");
  const [emp] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id));
  if (!emp) return;

  const userId = await getCurrentUserId();
  await db
    .update(schema.employees)
    .set({ active: !emp.active, updatedAt: new Date().toISOString() })
    .where(eq(schema.employees.id, id));

  await logAction({
    userId,
    action: "update",
    entity: "employee",
    entityId: id,
    details: { active: !emp.active },
  });

  revalidatePath(`/employees/${id}`);
  revalidatePath("/employees");
}
