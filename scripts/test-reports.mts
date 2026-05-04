import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

console.log("=== Test 1: monthly revenue (to_char YYYY-MM) ===");
const monthly = await sql`
  SELECT to_char(updated_at::timestamptz, 'YYYY-MM') as ym,
         coalesce(sum(total), 0)::float as total
    FROM orders
   WHERE status in ('delivered','paid')
   GROUP BY to_char(updated_at::timestamptz, 'YYYY-MM')
   ORDER BY 1 DESC
   LIMIT 6
`;
console.log(monthly);

console.log("\n=== Test 2: stage avg hours (extract epoch) ===");
const durations = await sql`
  SELECT stage,
         avg(extract(epoch from (completed_at::timestamptz - started_at::timestamptz)) / 3600.0)::float as avg_hours,
         count(*)::int as completed
    FROM production_stages
   WHERE status = 'done'
     AND started_at is not null
     AND completed_at is not null
   GROUP BY stage
`;
console.log(durations);

await sql.end();
console.log("\n✓ All queries OK");
