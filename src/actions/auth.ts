"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  destroySession,
  verifyPassword,
  getCurrentUser,
} from "@/lib/auth";
import { logAction } from "@/lib/audit";

const LoginSchema = z.object({
  email: z.string().min(1, "กรุณากรอกอีเมล"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type LoginState = {
  errors?: Record<string, string[]>;
  message?: string;
};

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.passwordHash || !user.active) {
    return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createSession(user.id);
  await logAction({
    userId: user.id,
    action: "login",
    entity: "users",
    entityId: user.id,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAction({
      userId: user.id,
      action: "logout",
      entity: "users",
      entityId: user.id,
    });
  }
  await destroySession();
  redirect("/login");
}
