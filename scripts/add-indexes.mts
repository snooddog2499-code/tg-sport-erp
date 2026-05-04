// Adds performance indexes on hot query paths.
// Idempotent — uses CREATE INDEX IF NOT EXISTS.
// Run with: npx tsx --env-file=.env.local scripts/add-indexes.mts

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

const indexes: { name: string; ddl: string }[] = [
  // Dashboard queries: WHERE created_at >= X / updated_at >= X
  {
    name: "orders_created_at_idx",
    ddl: `CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC)`,
  },
  {
    name: "orders_updated_at_idx",
    ddl: `CREATE INDEX IF NOT EXISTS orders_updated_at_idx ON orders(updated_at DESC)`,
  },
  // Filtering by status (orders/production/reports)
  {
    name: "orders_status_idx",
    ddl: `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status)`,
  },
  // JOIN paths
  {
    name: "orders_customer_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id)`,
  },
  {
    name: "orders_dealer_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS orders_dealer_id_idx ON orders(dealer_id) WHERE dealer_id IS NOT NULL`,
  },
  // Production board: WHERE status = 'active' is the dominant filter
  {
    name: "production_stages_status_idx",
    ddl: `CREATE INDEX IF NOT EXISTS production_stages_status_idx ON production_stages(status)`,
  },
  {
    name: "production_stages_order_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS production_stages_order_id_idx ON production_stages(order_id)`,
  },
  {
    name: "production_stages_completed_at_idx",
    ddl: `CREATE INDEX IF NOT EXISTS production_stages_completed_at_idx ON production_stages(completed_at) WHERE completed_at IS NOT NULL`,
  },
  // Dashboard payment aggregation
  {
    name: "payments_received_at_idx",
    ddl: `CREATE INDEX IF NOT EXISTS payments_received_at_idx ON payments(received_at DESC)`,
  },
  {
    name: "payments_order_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id)`,
  },
  // Withdrawals page
  {
    name: "material_withdrawals_withdrawn_at_idx",
    ddl: `CREATE INDEX IF NOT EXISTS material_withdrawals_withdrawn_at_idx ON material_withdrawals(withdrawn_at DESC)`,
  },
  {
    name: "material_withdrawals_material_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS material_withdrawals_material_id_idx ON material_withdrawals(material_id)`,
  },
  // Production board image lookup
  {
    name: "order_files_order_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS order_files_order_id_idx ON order_files(order_id)`,
  },
  {
    name: "designs_order_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS designs_order_id_idx ON designs(order_id)`,
  },
  // Audit log: ORDER BY at DESC
  {
    name: "audit_log_at_idx",
    ddl: `CREATE INDEX IF NOT EXISTS audit_log_at_idx ON audit_log(at DESC)`,
  },
  // Sessions lookup on every page render
  {
    name: "sessions_user_id_idx",
    ddl: `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`,
  },
];

console.log(`Creating ${indexes.length} indexes...`);
for (const ix of indexes) {
  const start = Date.now();
  try {
    await sql.unsafe(ix.ddl);
    console.log(`  ✓ ${ix.name} (${Date.now() - start}ms)`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${ix.name}: ${msg}`);
  }
}

// Verify all indexes exist
console.log("\n=== Indexes on hot tables ===");
const rows = await sql`
  SELECT tablename, indexname
    FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname LIKE '%_idx'
   ORDER BY tablename, indexname
`;
let lastTable = "";
for (const r of rows) {
  if (r.tablename !== lastTable) {
    console.log(`\n${r.tablename}`);
    lastTable = r.tablename;
  }
  console.log(`  • ${r.indexname}`);
}

await sql.end();
console.log("\n✓ Done");
