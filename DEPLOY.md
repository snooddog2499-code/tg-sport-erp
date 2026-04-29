# Deploy TG Sport ERP — Vercel + Supabase

โค้ดในตอนนี้ **ย้ายจาก SQLite → Postgres + Supabase Storage เรียบร้อยแล้ว** ✅
เหลือแค่ตั้งค่า credentials + push + deploy

---

## STEP 1 — สมัครบริการ (ทำเองที่บราวเซอร์)

### 1.1 Supabase Project
1. https://supabase.com → Sign up (Google) → **New Project**
2. ตั้งค่า:
   - **Name:** `tg-sport-erp`
   - **Database password:** ตั้งและจดไว้
   - **Region:** Southeast Asia (Singapore)
3. รอประมาณ 2 นาที จนสถานะเป็น `Active`
4. ไป **Project Settings → Database → Connection string**
   - copy **Transaction mode** (port 6543) → จะใช้เป็น `DATABASE_URL`
   - copy **Session mode** (port 5432) → จะใช้เป็น `DIRECT_URL`
   - แทนที่ `[YOUR-PASSWORD]` ด้วย password ที่ตั้งไว้
5. ไป **Project Settings → API**
   - copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - copy `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - copy `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (เก็บลับ)

### 1.2 Storage Bucket
1. ไป **Storage → New bucket**
2. **Name:** `uploads`
3. **Public bucket:** ✅ (ติ๊ก)
4. กด Create

### 1.3 GitHub
1. https://github.com → New repository (private ก็ได้)
2. ที่เครื่อง:
   ```bash
   cd tg-sport-erp
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/tg-sport-erp.git
   git push -u origin main
   ```

### 1.4 Vercel
1. https://vercel.com → Sign up ด้วย GitHub
2. ยังไม่ต้อง Import — รอ STEP 2

---

## STEP 2 — Run migration ที่เครื่องคุณ (15 นาที)

### 2.1 ใส่ credentials
สร้างไฟล์ `.env.local` ที่โฟลเดอร์ `tg-sport-erp/`:
```bash
cp .env.example .env.local
```
แล้วเปิดด้วย editor ใส่ค่าทั้ง 5 ตัวที่ได้จาก Supabase

### 2.2 Generate + run migration
```bash
npm run db:generate    # สร้างไฟล์ migration SQL ใน drizzle/
npm run db:migrate     # รัน migration บน Supabase
```

ถ้าผ่าน ตาราง 20 ตารางจะปรากฏใน Supabase → Table Editor

### 2.3 Seed ข้อมูลเริ่มต้น (เฉพาะครั้งแรก)
```bash
npm run db:seed
```
จะสร้าง:
- 9 user accounts (owner + admin + ช่างทุกแผนก) — รหัสผ่าน `password123`
- 4 customers, 5 orders ตัวอย่าง
- 8 materials

### 2.4 ทดสอบใน dev
```bash
npm run dev
```
เปิด http://localhost:3000 → Login `owner@tgsport.co` / `password123` →
ลองอัปโหลดลายออกแบบ + ส่งกลับมาดูว่ารูปไปอยู่บน Supabase Storage จริง

---

## STEP 3 — Deploy ขึ้น Vercel

1. https://vercel.com → **Add New → Project**
2. Import repo `tg-sport-erp` จาก GitHub
3. **Root directory:** `tg-sport-erp` (ถ้า monorepo)
4. **Environment Variables** — copy ค่าทั้งหมดจาก `.env.local`:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
   - `LINE_CHANNEL_ACCESS_TOKEN` (optional)
5. กด **Deploy**

ภายใน 2 นาทีจะได้ URL `https://tg-sport-erp-xxx.vercel.app` พร้อมใช้

---

## STEP 4 — หลัง deploy ครั้งแรก

1. เข้า URL → Login owner → **เปลี่ยนรหัสผ่านทันที** ที่ /settings/users
2. ลบ user ตัวอย่างที่ไม่ใช้ออก (admin, ช่างต่าง ๆ)
3. สร้าง user จริงให้พนักงานในทีม
4. ตั้งสิทธิ์เมนูตามต้องการที่ /settings/permissions
5. (ถ้าจะใช้ LINE) สร้าง LINE OA + ใส่ token

---

## ค่าใช้จ่ายโดยประมาณ (ต่อเดือน, 21 พนักงาน)

| บริการ | Free tier | ใช้จริง |
|--------|-----------|--------|
| **Vercel Hobby** | 100GB bandwidth | $0 |
| **Supabase Free** | 500MB DB, 1GB storage, 5GB egress | $0–25 |
| Supabase Pro (ถ้าโต) | $25/mo | $25 |
| LINE Messaging API Free | 200 msg/เดือน | $0 |

**เดือนแรก ฿0** — ฟรีทั้งหมด

---

## ปัญหาที่อาจเจอ

### Migration error: prepared statement
ถ้า `db:migrate` error เกี่ยวกับ prepared statement → ตรวจสอบว่า `DIRECT_URL` ใช้ port **5432** ไม่ใช่ 6543

### รูปไม่ขึ้นใน production
- ตรวจสอบว่า bucket `uploads` ตั้งเป็น **Public** ใน Supabase Storage
- ตรวจสอบ Vercel env `SUPABASE_SERVICE_ROLE_KEY` ตั้งถูกต้อง

### Login ไม่ผ่าน
- ตรวจสอบ `DATABASE_URL` ใช้ port **6543** (Transaction mode)
- ตรวจสอบ Vercel env ตั้งครบ
