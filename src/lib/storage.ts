import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

let cached: ReturnType<typeof createClient> | null = null;

function client() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Supabase Storage not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return cached;
}

export async function uploadToStorage(
  pathInBucket: string,
  file: File
): Promise<string> {
  const supabase = client();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathInBucket, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathInBucket);
  return data.publicUrl;
}

export async function deleteFromStorage(publicUrl: string): Promise<void> {
  const supabase = client();
  // Extract pathInBucket from public URL: .../storage/v1/object/public/{bucket}/{path}
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const pathInBucket = publicUrl.substring(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([pathInBucket]);
}
