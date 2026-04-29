import { getCurrentUser } from "./auth";

export async function getCurrentUserId(): Promise<number | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
