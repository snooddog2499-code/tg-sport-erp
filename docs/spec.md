# TG Sport ERP — Specification

> ระบบ ERP สำหรับ TG Sport โรงงานพิมพ์เสื้อ sublimation กาฬสินธุ์
> เวอร์ชัน 0.1 — Phase 1 (Core)

## 1. เป้าหมายธุรกิจ

- ติดตามออเดอร์ทุกใบว่าอยู่ขั้นไหน (ไม่ต้องเดาหน้างาน)
- ลดความผิดพลาดจากจดมือ/LINE chat
- แอดมิน 1 คนจัดการออเดอร์ได้ถึง 100+ ใบ/เดือน โดยไม่พลาด
- ลูกค้าเชื่อมั่น: ตรวจสถานะได้, เห็นลายก่อนอนุมัติ

## 2. User Roles (8 ระดับ)

| Role | ทำอะไรได้ | ห้ามทำ |
|---|---|---|
| **owner** (เจ้าของ) | ทุกอย่าง + ดูรายงานการเงิน | — |
| **manager** (ผู้จัดการ) | ทุกอย่าง ยกเว้นลบผู้ใช้ | เปลี่ยนเงินเดือน |
| **admin** (แอดมิน) | สร้าง/แก้ออเดอร์, ตอบลูกค้า | ดู payroll |
| **graphic** (กราฟฟิก) | อัปโหลดลาย, track revision | แก้ราคา |
| **print** (สั่งพิมพ์) | อัปเดตสเตจ print | แก้ออเดอร์ |
| **roll** (รีดโรล) | อัปเดตสเตจ roll | แก้ออเดอร์ |
| **laser** (เลเซอร์) | อัปเดตสเตจ laser | แก้ออเดอร์ |
| **sew** (เย็บ) | อัปเดตสเตจ sew | แก้ออเดอร์ |
| **qc** (QC) | อัปเดตสเตจ QC, flag issues | แก้ราคา |

## 3. Order Lifecycle (8 สถานะ)

```
received  →  quoted  →  approved  →  in_production  →  qc  →  ready  →  delivered  →  paid
   ↓           ↓            ↓                                                             
cancelled   cancelled   cancelled                                                         
```

- **received**: รับออเดอร์ยังไม่ได้เสนอราคา
- **quoted**: ส่งใบเสนอราคาแล้ว รอลูกค้าตอบ
- **approved**: ลูกค้าตกลง + อนุมัติลาย → เข้าผลิต
- **in_production**: กำลังผลิต (ดูสเตจใน Production Board)
- **qc**: ผ่านสาย 5 แผนกแล้ว อยู่ที่ QC
- **ready**: QC ผ่าน พร้อมส่ง
- **delivered**: ส่งของแล้ว รอจ่ายเงิน (ถ้ายังไม่ครบ)
- **paid**: จ่ายครบ ปิดออเดอร์
- **cancelled**: ยกเลิก (บันทึกเหตุผล)

## 4. Production Stages (6 สเตจ)

เมื่อ order status = `in_production`, ติดตามผ่าน `production_stages`:

1. **graphic** — กราฟฟิก (4 คน)
2. **print** — สั่งพิมพ์ sublimation (1 คน)
3. **roll** — รีดโรลลงผ้า (1 คน)
4. **laser** — เลเซอร์ตัดชิ้น (1 คน)
5. **sew** — เย็บประกอบ (10 คน)
6. **qc** — ตรวจคุณภาพ (1 คน)

แต่ละสเตจมี: `started_at`, `completed_at`, `assigned_to`, `note`

## 5. Database Schema (14 ตาราง)

ดู `src/db/schema.ts` สำหรับโค้ดจริง

```
users              id, email, password_hash, name, role, dept, active, created_at
customers          id, name, phone, line_id, address, tier, note, created_at
orders             id, code, customer_id, status, deadline, notes, total, deposit, paid, assigned_admin_id, created_at, updated_at
order_items        id, order_id, garment_type, qty, size_breakdown(json), unit_price, note
designs            id, order_id, file_url, version, status(draft|sent|approved|revision), approval_token, sent_at, approved_at
production_stages  id, order_id, stage, status(pending|active|done), assigned_to, started_at, completed_at, note
materials          id, name, unit, stock, reorder_point, cost_per_unit, supplier
material_usage     id, order_id, material_id, qty_used, recorded_at
quotations         id, order_id, pdf_url, sent_at, accepted_at
invoices           id, order_id, invoice_no, pdf_url, issued_at, paid_at, amount
payments           id, invoice_id, method, amount, received_at, note
employees          id, user_id, name, dept, salary, salary_type(monthly|daily|piece), start_date, active
attendance         id, employee_id, date, check_in, check_out, ot_hours
audit_log          id, user_id, action, entity, entity_id, details(json), at
```

## 6. Default Business Rules (ตั้งไว้ก่อน รอยืนยัน)

| ข้อ | Default | แก้ไขที่ไหน |
|---|---|---|
| มัดจำ | 50% ก่อนเข้าสาย, 50% เมื่อส่ง | Settings |
| บันไดราคา | 5–19: ราคาเต็ม, 20–49: -5%, 50+: -10% | Settings/pricing |
| งานแก้ฟรี | 2 รอบ (รอบ 3 คิด 200 ฿) | Settings/design |
| ขนาดเสื้อ | S / M / L / XL / 2XL / 3XL | Settings/sizes |
| ค่าส่ง | ในจังหวัด: ฟรี, ต่างจังหวัด: ตามจริง | Settings/delivery |
| ขั้นต่ำ | 5 ตัว/ออเดอร์ | Settings |
| อนุมัติลาย | ลูกค้ายืนยันก่อนเข้าพิมพ์เสมอ | ไม่อนุญาต bypass |
| Order code | `TGS-YYMM-NNNN` (เช่น TGS-2604-0001) | Auto |

## 7. Tech Stack

| ชั้น | เทคโนโลยี | เหตุผล |
|---|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript | ภาษาเดียวจบ, SSR, AI เขียนได้ดี |
| Styling | Tailwind CSS 4 | เร็ว, ไม่ต้องเขียน CSS แยก |
| Database (dev) | SQLite (ไฟล์ `dev.db`) | ไม่ต้องติดตั้ง server, portable |
| Database (prod) | Postgres (Supabase) | ขยายได้, auth ฟรี, realtime |
| ORM | Drizzle | TS-first, light, swap DB ได้ |
| Forms | Server Actions + native HTML | ไม่ต้อง API route ซ้ำซ้อน |
| Validation | Zod | schema เดียว ใช้ทั้ง client + server |
| Auth (Phase 2) | Supabase Auth | รองรับ LINE Login |
| File Storage | Supabase Storage | ใส่ Cloudflare R2 ทีหลังได้ |
| PDF | @react-pdf/renderer | ทำใน server, no browser needed |
| Deploy | Vercel | auto-deploy จาก GitHub |

## 8. Deployment Plan

**Dev:** SQLite local, `npm run dev`
**Staging:** Vercel preview deploy + Supabase staging project
**Prod:** Vercel prod + Supabase prod + custom domain

## 9. Roadmap

| Phase | เนื้อหา | ระยะเวลา |
|---|---|---|
| **1. Core** (ตอนนี้) | DB + Orders + Customers + Production Board + Dashboard | สัปดาห์ 1–4 |
| 2. Auth | Login, role-based access, audit log | สัปดาห์ 5 |
| 3. Design Approval | Upload, revision, customer approve link | สัปดาห์ 6–7 |
| 4. Quotation + Invoice | PDF generate, send via LINE/Email | สัปดาห์ 8–9 |
| 5. Inventory + Costing | Material tracking, BOM, cost auto | สัปดาห์ 10–11 |
| 6. HR + Payroll | Attendance, salary | สัปดาห์ 12–14 |
| 7. Reports | Dashboards, KPI, profit/order | สัปดาห์ 15–16 |
| 8. LINE OA | Customer status query, notifications | สัปดาห์ 17–18 |
| 9. Production ready | Migrate SQLite → Supabase, deploy | สัปดาห์ 19–20 |

## 10. สิ่งที่ยังต้องยืนยันจากเจ้าของ

- ชื่อ 2 ตำแหน่งที่เหลือ (เพื่อให้ครบ 21 คน)
- BOM จริง: เสื้อ 1 ตัวใช้ผ้ากี่เมตร, หมึก, กระดาษซับ
- แนวทางราคา: ยืนยัน/แก้ default ในหัวข้อ 6
- Domain ที่อยากใช้
