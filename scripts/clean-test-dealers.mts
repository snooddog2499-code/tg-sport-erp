// One-shot cleanup: removes the seed/test dealers
// (SportHouse Mahasarakham, ช็อปกีฬาอุดร, ร้านกีฬาสยาม).
// Also cleans dealer_prices and unlinks any orders that still point
// at them (sets orders.dealer_id = NULL — does NOT delete the order).

import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

console.log("=== Test dealers in DB ===");
const dealers = await sql`
  SELECT id, name, phone, active
  FROM dealers
  WHERE name IN (
    'SportHouse Mahasarakham',
    'ช็อปกีฬาอุดร',
    'ร้านกีฬาสยาม (ขอนแก่น)',
    'ร้านกีฬาสยาม'
  )
  ORDER BY id
`;
for (const d of dealers) {
  console.log(`  #${d.id} ${d.name} (${d.phone}) ${d.active ? "active" : "off"}`);
}

if (dealers.length === 0) {
  console.log("\nNo matching test dealers found — nothing to delete.");
  await sql.end();
  process.exit(0);
}

const ids = dealers.map((d) => d.id as number);

// Check dependencies first
const orderRefs = await sql`
  SELECT id, code FROM orders WHERE dealer_id = ANY(${ids})
`;
console.log(`\nOrders still linked to these dealers: ${orderRefs.length}`);
orderRefs.forEach((o) => console.log(`  ${o.code} (id ${o.id})`));

const priceRows = await sql`
  SELECT count(*)::int as c FROM dealer_prices WHERE dealer_id = ANY(${ids})
`;
console.log(`Dealer price rows: ${priceRows[0].c}`);

const dealerUserRows = await sql`
  SELECT id, email FROM users WHERE dealer_id = ANY(${ids})
`;
console.log(`User accounts linked: ${dealerUserRows.length}`);
dealerUserRows.forEach((u) =>
  console.log(`  user #${u.id} ${u.email}`)
);

console.log("\n=== Cleanup ===");

// 1) Unlink orders (keep orders, just set dealer_id = null)
const unlinked = await sql`
  UPDATE orders
     SET dealer_id = NULL,
         dealer_discount = 0,
         dealer_commission = 0
   WHERE dealer_id = ANY(${ids})
   RETURNING id
`;
console.log(`  ✓ unlinked ${unlinked.length} orders`);

// 2) Unlink any user accounts that point at these dealers
const unlinkedUsers = await sql`
  UPDATE users SET dealer_id = NULL WHERE dealer_id = ANY(${ids}) RETURNING id
`;
console.log(`  ✓ unlinked ${unlinkedUsers.length} user accounts`);

// 3) Delete dealer_prices (cascade would handle this, but explicit is safer)
const delPrices = await sql`
  DELETE FROM dealer_prices WHERE dealer_id = ANY(${ids}) RETURNING id
`;
console.log(`  ✓ deleted ${delPrices.length} dealer_prices rows`);

// 4) Delete dealers
const delDealers = await sql`
  DELETE FROM dealers WHERE id = ANY(${ids}) RETURNING id, name
`;
console.log(`  ✓ deleted ${delDealers.length} dealers:`);
delDealers.forEach((d) => console.log(`     ${d.name}`));

await sql.end();
console.log("\n🎉 Done");
