"use server";

// Direct-upload helpers: the browser uploads files straight to Supabase
// Storage using a short-lived signed URL, bypassing the Vercel function
// body limit. The server only ever signs the URL and later persists the
// resulting public URL — it never streams file bytes.

import "server-only";
import { randomBytes } from "crypto";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";
import { requirePerm } from "@/lib/permissions";
import {
  ORDER_FILE_ACCEPT,
  DESIGN_ACCEPT,
} from "@/lib/uploads";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeExt(filename: string, mime: string): string {
  const mimeExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
  };
  const fromMime = mimeExt[mime];
  if (fromMime) return fromMime;
  const raw = path.extname(filename).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(raw)) return raw;
  return ".bin";
}

export type SignedUpload = {
  path: string;
  token: string;
  publicUrl: string;
  bucket: string;
};

/**
 * Sign a single upload slot for an order attachment. Returns the path,
 * token, and the eventual public URL (predictable from the path).
 *
 * The path lives in `orders/_pending/{userId}/{nonce}{ext}` so files
 * uploaded but never linked to an order can be cleaned up later.
 */
export async function signOrderAttachmentUpload(
  filename: string,
  mime: string
): Promise<{ ok: true; data: SignedUpload } | { ok: false; error: string }> {
  await requirePerm("order:create");
  const user = await requireAuth();

  if (!ORDER_FILE_ACCEPT.includes(mime)) {
    return {
      ok: false,
      error: `รูปแบบไฟล์ไม่รองรับ (${mime || "ไม่ทราบชนิด"})`,
    };
  }

  const ext = safeExt(filename, mime);
  const nonce = randomBytes(8).toString("hex");
  const ts = Date.now();
  const filePath = `orders/_pending/${user.id}/${ts}-${nonce}${ext}`;

  const supabase = admin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "ไม่สามารถสร้างลิงก์อัปโหลดได้" };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return {
    ok: true,
    data: {
      path: filePath,
      token: data.token,
      publicUrl: pub.publicUrl,
      bucket: BUCKET,
    },
  };
}

/**
 * Sign a single upload slot for a design (graphic file attached to an
 * order). Same idea but uses the design accept list.
 */
export async function signDesignUpload(
  orderId: number,
  version: number,
  filename: string,
  mime: string
): Promise<{ ok: true; data: SignedUpload } | { ok: false; error: string }> {
  await requirePerm("design:manage");

  if (!DESIGN_ACCEPT.includes(mime)) {
    return {
      ok: false,
      error: `รูปแบบไฟล์ไม่รองรับ (${mime || "ไม่ทราบชนิด"})`,
    };
  }

  const ext = safeExt(filename, mime);
  const nonce = randomBytes(6).toString("hex");
  const filePath = `designs/${orderId}/v${version}-${nonce}${ext}`;

  const supabase = admin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "ไม่สามารถสร้างลิงก์อัปโหลดได้" };
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return {
    ok: true,
    data: {
      path: filePath,
      token: data.token,
      publicUrl: pub.publicUrl,
      bucket: BUCKET,
    },
  };
}
