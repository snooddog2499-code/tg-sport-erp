import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const users = await sql`SELECT id, email, name, role, active FROM users ORDER BY id`;
console.log("All users:");
users.forEach((u) =>
  console.log(
    `  #${u.id} ${u.email} (${u.role}) ${u.name} ${u.active ? "active" : "INACTIVE"}`
  )
);
console.log("---");
const overrides = await sql`SELECT user_id, menu_key FROM user_menu_access ORDER BY user_id, menu_key`;
console.log("Overrides:");
let prev = -1;
for (const r of overrides) {
  if (r.user_id !== prev) {
    console.log(`  user ${r.user_id}:`);
    prev = r.user_id;
  }
  console.log(`    ${r.menu_key}`);
}
await sql.end();
