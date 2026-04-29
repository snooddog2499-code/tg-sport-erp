import "server-only";
import path from "path";
import { randomBytes } from "crypto";
import { uploadToStorage, deleteFromStorage } from "./storage";

export const MAX_DESIGN_SIZE = 15 * 1024 * 1024;
export const MAX_ORDER_FILE_SIZE = 20 * 1024 * 1024;

export const DESIGN_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export const ORDER_FILE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function safeExt(filename: string, mime: string): string {
  const mimeExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
  };
  const fromMime = mimeExt[mime];
  if (fromMime) return fromMime;
  const raw = path.extname(filename).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(raw)) return raw;
  return ".bin";
}

export async function saveDesignFile(
  orderId: number,
  file: File,
  version: number
): Promise<{ publicUrl: string; absPath: string }> {
  const ext = safeExt(file.name, file.type);
  const nonce = randomBytes(6).toString("hex");
  const pathInBucket = `designs/${orderId}/v${version}-${nonce}${ext}`;
  const publicUrl = await uploadToStorage(pathInBucket, file);
  return { publicUrl, absPath: publicUrl };
}

export async function deleteDesignFile(publicUrl: string): Promise<void> {
  await deleteFromStorage(publicUrl);
}

export async function saveOrderFile(
  orderId: number,
  file: File
): Promise<{ publicUrl: string; absPath: string }> {
  const ext = safeExt(file.name, file.type);
  const nonce = randomBytes(6).toString("hex");
  const pathInBucket = `orders/${orderId}/${Date.now()}-${nonce}${ext}`;
  const publicUrl = await uploadToStorage(pathInBucket, file);
  return { publicUrl, absPath: publicUrl };
}

export async function deleteOrderFile(publicUrl: string): Promise<void> {
  await deleteFromStorage(publicUrl);
}

export async function saveAttendancePhoto(
  employeeId: number,
  date: string,
  type: "in" | "out",
  file: File
): Promise<{ publicUrl: string; absPath: string }> {
  const ext = safeExt(file.name, file.type);
  const nonce = randomBytes(4).toString("hex");
  const pathInBucket = `attendance/${date}/emp${employeeId}-${type}-${Date.now()}-${nonce}${ext}`;
  const publicUrl = await uploadToStorage(pathInBucket, file);
  return { publicUrl, absPath: publicUrl };
}

export function isImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return mime.startsWith("image/");
}

export function inferMimeFromUrl(url: string): string {
  const ext = path.extname(url.split("?")[0]).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".pdf": "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}
