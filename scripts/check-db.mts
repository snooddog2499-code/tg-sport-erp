import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const total = await sql`SELECT count(*)::int as c FROM users`;
const dups = await sql`SELECT email, count(*)::int as c FROM users GROUP BY email HAVING count(*) > 1`;
console.log(`Total users: ${total[0].c}`);
console.log(`Duplicates: ${dups.length}`);
if (dups.length > 0) console.log(dups);
const allCounts = await sql`
  SELECT 'users' as t, count(*)::int as c FROM users
  UNION ALL SELECT 'customers', count(*)::int FROM customers
  UNION ALL SELECT 'orders', count(*)::int FROM orders
  UNION ALL SELECT 'order_items', count(*)::int FROM order_items
  UNION ALL SELECT 'materials', count(*)::int FROM materials
  UNION ALL SELECT 'employees', count(*)::int FROM employees
  UNION ALL SELECT 'attendance', count(*)::int FROM attendance
  UNION ALL SELECT 'dealers', count(*)::int FROM dealers
  UNION ALL SELECT 'production_stages', count(*)::int FROM production_stages
`;
console.log("\nTable counts:");
allCounts.forEach((r) => console.log(`  ${r.t}: ${r.c}`));
await sql.end();
