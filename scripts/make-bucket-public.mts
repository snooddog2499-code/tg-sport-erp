import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

const { data: info, error: getErr } = await supabase.storage.getBucket(bucket);
if (getErr) {
  console.error(`✗ getBucket: ${getErr.message}`);
  process.exit(1);
}
console.log(`Bucket "${bucket}" current state:`, {
  public: info.public,
  fileSizeLimit: info.file_size_limit,
});

if (!info.public) {
  const { error: updErr } = await supabase.storage.updateBucket(bucket, {
    public: true,
  });
  if (updErr) {
    console.error(`✗ updateBucket: ${updErr.message}`);
    process.exit(1);
  }
  console.log(`✓ updated bucket to public`);
} else {
  console.log(`✓ bucket already public`);
}

// Re-test fetch
const testKey = `_smoke/public-test-${Date.now()}.txt`;
const buf = Buffer.from("public test");
await supabase.storage.from(bucket).upload(testKey, buf, {
  contentType: "text/plain",
  upsert: false,
});
const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(testKey);
const res = await fetch(urlData.publicUrl);
console.log(`Fetch test: HTTP ${res.status} ${res.ok ? "✓" : "✗"}`);
await supabase.storage.from(bucket).remove([testKey]);
