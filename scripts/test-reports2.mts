import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

console.log("=== Test topCustomers — exact drizzle SQL (group by customer_id only) ===");
try {
  const rows = await sql`
    SELECT o.customer_id,
           c.name as customer_name,
           count(*)::int as order_count,
           coalesce(sum(o.total), 0)::float as total_revenue
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
     GROUP BY o.customer_id
     ORDER BY sum(o.total) DESC
     LIMIT 5
  `;
  console.log("OK:", rows.length, "rows");
} catch (e: unknown) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
}

console.log("\n=== Test dealerSales — exact drizzle SQL (group by dealer.id only) ===");
try {
  const rows = await sql`
    SELECT d.id as dealer_id,
           d.name as dealer_name,
           count(o.id)::int as order_count
      FROM dealers d
      LEFT JOIN orders o ON o.dealer_id = d.id
     GROUP BY d.id
     ORDER BY sum(o.total) DESC
     LIMIT 10
  `;
  console.log("OK:", rows.length, "rows");
} catch (e: unknown) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
}

await sql.end();
