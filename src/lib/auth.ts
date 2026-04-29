import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq, lt } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "tg_session";
const SESSION_DAYS = 30;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

function sessionIdHash(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}

export async function createSession(userId: number): Promise<string> {
  const id = newSessionId();
  const stored = sessionIdHash(id);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.insert(schema.sessions).values({
    id: stored,
    userId,
    expiresAt,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return id;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const stored = sessionIdHash(raw);
    await db.delete(schema.sessions).where(eq(schema.sessions.id, stored));
  }
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: (typeof schema.users.$inferSelect)["role"];
  dept: string | null;
  dealerId: number | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const stored = sessionIdHash(raw);
  const now = new Date().toISOString();

  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      dept: schema.users.dept,
      dealerId: schema.users.dealerId,
      active: schema.users.active,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, stored))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (!row.active) return null;
  if (row.expiresAt < now) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, stored));
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    dept: row.dept,
    dealerId: row.dealerId ?? null,
  };
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  roles: CurrentUser["role"][]
): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export async function pruneExpiredSessions(): Promise<void> {
  const now = new Date().toISOString();
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now));
}
