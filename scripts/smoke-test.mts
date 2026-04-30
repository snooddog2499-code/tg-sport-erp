import postgres from "postgres";
import bcrypt from "bcryptjs";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

console.log("=== Auth flow smoke test ===");

// 1. Look up owner
const [owner] = await sql`
  SELECT id, email, name, password_hash, role, active
  FROM users WHERE email = ${"owner@tgsport.co"} LIMIT 1
`;
if (!owner) {
  console.error("✗ owner not found");
  process.exit(1);
}
console.log(`✓ Found owner: id=${owner.id} role=${owner.role} active=${owner.active}`);

// 2. Verify password
const ok = await bcrypt.compare("password123", owner.password_hash);
console.log(`${ok ? "✓" : "✗"} password verifies: ${ok}`);
if (!ok) process.exit(1);

// 3. Storage env
console.log("\n=== Storage config ===");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
];
for (const k of required) {
  console.log(`${process.env[k] ? "✓" : "✗"} ${k}`);
}

// 4. Test storage upload
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const bucket = process.env.SUPABASE_STORAGE_BUCKET!;

const testKey = `_smoke/test-${Date.now()}.txt`;
const buf = Buffer.from(`smoke test at ${new Date().toISOString()}`);
console.log(`\n=== Storage upload test ===`);
const { error: upErr } = await supabase.storage
  .from(bucket)
  .upload(testKey, buf, { contentType: "text/plain", upsert: false });
if (upErr) {
  console.error(`✗ upload failed: ${upErr.message}`);
  await sql.end();
  process.exit(1);
}
const { data: url } = supabase.storage.from(bucket).getPublicUrl(testKey);
console.log(`✓ uploaded: ${url.publicUrl}`);

// 5. Fetch back
const res = await fetch(url.publicUrl);
console.log(`${res.ok ? "✓" : "✗"} public URL fetches: HTTP ${res.status}`);

// 6. Cleanup
const { error: delErr } = await supabase.storage.from(bucket).remove([testKey]);
console.log(`${delErr ? "✗" : "✓"} cleanup: ${delErr?.message ?? "ok"}`);

await sql.end();
console.log("\n🎉 All smoke tests passed");
