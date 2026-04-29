import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { db, schema } from "./index";
import { productionStageEnum } from "./schema";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  await db.delete(schema.payments);
  await db.delete(schema.invoices);
  await db.delete(schema.quotations);
  await db.delete(schema.materialUsage);
  await db.delete(schema.materials);
  await db.delete(schema.designs);
  await db.delete(schema.auditLog);
  await db.delete(schema.sessions);
  await db.delete(schema.attendance);
  await db.delete(schema.employees);
  await db.delete(schema.productionStages);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.customers);
  await db.delete(schema.users);
  await db.delete(schema.dealers);

  const defaultHash = await bcrypt.hash("password123", 10);

  const [owner] = await db
    .insert(schema.users)
    .values({
      email: "owner@tgsport.co",
      name: "เจ้าของ",
      role: "owner",
      passwordHash: defaultHash,
    })
    .returning();

  await db.insert(schema.users).values([
    { email: "admin@tgsport.co", name: "แอดมิน 1", role: "admin", dept: "admin", passwordHash: defaultHash },
    { email: "graphic1@tgsport.co", name: "กราฟฟิก 1", role: "graphic", dept: "graphic", passwordHash: defaultHash },
    { email: "graphic2@tgsport.co", name: "กราฟฟิก 2", role: "graphic", dept: "graphic", passwordHash: defaultHash },
    { email: "print1@tgsport.co", name: "ช่างพิมพ์", role: "print", dept: "print", passwordHash: defaultHash },
    { email: "roll1@tgsport.co", name: "ช่างรีดโรล", role: "roll", dept: "roll", passwordHash: defaultHash },
    { email: "laser1@tgsport.co", name: "ช่างเลเซอร์", role: "laser", dept: "laser", passwordHash: defaultHash },
    { email: "sew1@tgsport.co", name: "ช่างเย็บ 1", role: "sew", dept: "sew", passwordHash: defaultHash },
    { email: "qc1@tgsport.co", name: "QC", role: "qc", dept: "qc", passwordHash: defaultHash },
  ]);

  const dealersInserted = await db
    .insert(schema.dealers)
    .values([
      {
        name: "ร้านกีฬาสยาม (ขอนแก่น)",
        phone: "086-777-1111",
        lineId: "@siamsport-kk",
        email: "siamsport.kk@gmail.com",
        discountPct: 15,
        commissionPct: 8,
        note: "ตัวแทนหลักภาคอีสาน รับของสัปดาห์ละครั้ง",
      },
      {
        name: "ช็อปกีฬาอุดร",
        phone: "088-222-3333",
        lineId: "@udonsport",
        discountPct: 10,
        commissionPct: 5,
      },
      {
        name: "SportHouse Mahasarakham",
        phone: "089-555-7777",
        discountPct: 12,
        commissionPct: 6,
      },
    ])
    .returning();

  await db.insert(schema.users).values([
    {
      email: "dealer1@tgsport.co",
      name: "ร้านกีฬาสยาม",
      role: "dealer",
      passwordHash: defaultHash,
      dealerId: dealersInserted[0].id,
    },
    {
      email: "dealer2@tgsport.co",
      name: "ช็อปกีฬาอุดร",
      role: "dealer",
      passwordHash: defaultHash,
      dealerId: dealersInserted[1].id,
    },
  ]);

  const customersData = await db
    .insert(schema.customers)
    .values([
      {
        name: "ทีมฟุตบอล อบต.หนองกุงศรี",
        phone: "089-111-2222",
        lineId: "@nongkoongsri",
        tier: "vip",
      },
      {
        name: "โรงเรียนกาฬสินธุ์พิทยาสรรพ์",
        phone: "043-811-xxx",
        tier: "regular",
      },
      {
        name: "บริษัท XYZ จำกัด",
        phone: "081-333-4444",
        email: "contact@xyz.co.th",
        tier: "new",
      },
      {
        name: "ทีมวิ่ง กาฬสินธุ์รันเนอร์",
        phone: "086-555-6666",
        lineId: "@ksrun",
        tier: "regular",
      },
    ])
    .returning();

  const ym = new Date().toISOString().slice(2, 7).replace("-", "");

  const ordersData = [
    {
      code: `TGS-${ym}-0001`,
      customerId: customersData[0].id,
      status: "in_production" as const,
      deadline: "2026-05-15",
      notes: "ทีมอบต. — ลายโลโก้สวน",
      total: 8000,
      deposit: 4000,
      paid: 4000,
      assignedAdminId: owner.id,
      dealerId: dealersInserted[0].id,
      dealerDiscount: 8000 * 0.15 / 0.85,
      dealerCommission: 8000 * 0.08,
    },
    {
      code: `TGS-${ym}-0002`,
      customerId: customersData[1].id,
      status: "approved" as const,
      deadline: "2026-05-20",
      notes: "เสื้อกีฬาสีโรงเรียน 4 สี",
      total: 25000,
      deposit: 12500,
      paid: 12500,
      assignedAdminId: owner.id,
    },
    {
      code: `TGS-${ym}-0003`,
      customerId: customersData[2].id,
      status: "quoted" as const,
      deadline: "2026-06-01",
      notes: "เสื้อโปโลบริษัท รอตอบรับ",
      total: 0,
      deposit: 0,
      paid: 0,
    },
    {
      code: `TGS-${ym}-0004`,
      customerId: customersData[3].id,
      status: "received" as const,
      deadline: "2026-06-10",
      notes: "เสื้อวิ่ง marathon",
      total: 0,
      deposit: 0,
      paid: 0,
    },
    {
      code: `TGS-${ym}-0005`,
      customerId: customersData[0].id,
      status: "delivered" as const,
      deadline: "2026-04-10",
      notes: "ออเดอร์เก่า จ่ายครบแล้ว",
      total: 5000,
      deposit: 2500,
      paid: 5000,
    },
  ];

  const insertedOrders = await db
    .insert(schema.orders)
    .values(ordersData)
    .returning();

  await db.insert(schema.orderItems).values([
    {
      orderId: insertedOrders[0].id,
      garmentType: "เสื้อบอล",
      qty: 20,
      unitPrice: 400,
      sizeBreakdown: JSON.stringify({ M: 5, L: 10, XL: 5 }),
    },
    {
      orderId: insertedOrders[1].id,
      garmentType: "เสื้อกีฬาสี",
      qty: 100,
      unitPrice: 250,
      sizeBreakdown: JSON.stringify({ S: 25, M: 35, L: 30, XL: 10 }),
    },
    {
      orderId: insertedOrders[4].id,
      garmentType: "เสื้อบอล",
      qty: 12,
      unitPrice: 420,
    },
  ]);

  const order1Stages = productionStageEnum.map((stage) => ({
    orderId: insertedOrders[0].id,
    stage,
    status:
      stage === "graphic"
        ? ("done" as const)
        : stage === "print"
          ? ("active" as const)
          : ("pending" as const),
    startedAt: stage === "graphic" || stage === "print" ? new Date().toISOString() : null,
    completedAt: stage === "graphic" ? new Date().toISOString() : null,
  }));
  await db.insert(schema.productionStages).values(order1Stages);

  await db.insert(schema.materials).values([
    {
      name: "ผ้าไมโครโพลีเอสเตอร์ 150g",
      unit: "เมตร",
      stock: 180,
      reorderPoint: 50,
      costPerUnit: 85,
      supplier: "ร้านผ้ากาฬสินธุ์",
    },
    {
      name: "กระดาษ Sublimation 100g",
      unit: "ม้วน",
      stock: 8,
      reorderPoint: 3,
      costPerUnit: 1200,
      supplier: "Digital Supply BKK",
    },
    {
      name: "หมึก Sublimation สีฟ้า (C)",
      unit: "ลิตร",
      stock: 1.2,
      reorderPoint: 2,
      costPerUnit: 1800,
      supplier: "Digital Supply BKK",
    },
    {
      name: "หมึก Sublimation สีแดง (M)",
      unit: "ลิตร",
      stock: 0.8,
      reorderPoint: 2,
      costPerUnit: 1800,
      supplier: "Digital Supply BKK",
    },
    {
      name: "หมึก Sublimation สีเหลือง (Y)",
      unit: "ลิตร",
      stock: 2.5,
      reorderPoint: 2,
      costPerUnit: 1800,
      supplier: "Digital Supply BKK",
    },
    {
      name: "หมึก Sublimation สีดำ (K)",
      unit: "ลิตร",
      stock: 3.0,
      reorderPoint: 2,
      costPerUnit: 1800,
      supplier: "Digital Supply BKK",
    },
    {
      name: "ด้ายโพลีเอสเตอร์ (ขาว)",
      unit: "ม้วน",
      stock: 24,
      reorderPoint: 10,
      costPerUnit: 45,
      supplier: "ร้านด้ายลำปาง",
    },
    {
      name: "ซิป #3 (ขาว)",
      unit: "ชิ้น",
      stock: 320,
      reorderPoint: 100,
      costPerUnit: 18,
    },
  ]);

  const allUsers = await db.select().from(schema.users);
  const employeeRows: Array<typeof schema.employees.$inferInsert> = allUsers
    .filter((u) => u.role !== "owner")
    .map((u) => ({
      userId: u.id,
      name: u.name,
      dept: u.dept ?? u.role,
      salary:
        u.role === "manager"
          ? 25000
          : u.role === "admin"
            ? 15000
            : u.role === "graphic"
              ? 13000
              : 12000,
      salaryType: "monthly" as const,
      startDate: "2025-01-01",
      active: true,
    }));
  await db.insert(schema.employees).values(employeeRows);

  const empsWithRows = await db.select().from(schema.employees);
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const attendanceRows = empsWithRows.flatMap((e) => [
    { employeeId: e.id, date: yStr, checkIn: "08:15", checkOut: "17:30", otHours: 1 },
    { employeeId: e.id, date: todayStr, checkIn: "08:05", checkOut: null, otHours: 0 },
  ]);
  await db.insert(schema.attendance).values(attendanceRows);

  console.log("✓ Users:", await db.$count(schema.users));
  console.log("✓ Dealers:", await db.$count(schema.dealers));
  console.log("✓ Customers:", await db.$count(schema.customers));
  console.log("✓ Orders:", await db.$count(schema.orders));
  console.log("✓ Order items:", await db.$count(schema.orderItems));
  console.log("✓ Production stages:", await db.$count(schema.productionStages));
  console.log("✓ Materials:", await db.$count(schema.materials));
  console.log("✓ Employees:", await db.$count(schema.employees));
  console.log("✓ Attendance:", await db.$count(schema.attendance));
  console.log("🎉 Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
