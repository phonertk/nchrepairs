# 🔧 FixFlow — ระบบแจ้งซ่อมออนไลน์

Next.js 14 + Supabase (PostgreSQL) + Deploy บน Vercel

---

## 📁 โครงสร้างไฟล์

```
fixflow/
├── app/
│   ├── globals.css          ← CSS ทั้งระบบ
│   ├── layout.tsx           ← Root layout
│   ├── page.tsx             ← Redirect หลัง login
│   ├── login/
│   │   └── page.tsx         ← หน้า Login + สมัครสมาชิก
│   ├── dashboard/
│   │   └── page.tsx         ← หน้าผู้ใช้ (แจ้งซ่อม + ติดตามสถานะ)
│   └── admin/
│       ├── layout.tsx       ← Layout + Sidebar Admin
│       ├── dashboard/       ← Dashboard + สถิติ
│       ├── tickets/         ← คำร้องทั้งหมด + Search/Filter
│       └── users/           ← จัดการผู้ใช้ + เปลี่ยน Role
├── components/
│   ├── Navbar.tsx           ← Navbar ที่ใช้ร่วมกัน
│   └── Toast.tsx            ← แจ้งเตือน
├── lib/
│   ├── supabase.ts          ← Supabase client (browser)
│   ├── supabase-server.ts   ← Supabase client (server)
│   └── helpers.ts           ← ฟังก์ชันช่วย (format date, badges)
├── supabase_setup.sql       ← SQL สร้าง database
├── .env.local.example       ← Template ค่า environment
├── vercel.json              ← Config สำหรับ Vercel
└── package.json
```

---

## 🚀 ขั้นตอนติดตั้งและ Deploy

### ขั้นที่ 1 — สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) → สมัครฟรี
2. กด **New Project** → ตั้งชื่อโปรเจกต์และรหัสผ่าน Database
3. รอประมาณ 1-2 นาทีให้ระบบ setup เสร็จ

### ขั้นที่ 2 — รัน SQL สร้างตาราง

1. ไปที่ **SQL Editor** (ในเมนูซ้าย)
2. กด **New Query**
3. วางโค้ดทั้งหมดจากไฟล์ `supabase_setup.sql`
4. กด **Run** (Ctrl+Enter)
5. ✅ ควรเห็น "Success. No rows returned"

### ขั้นที่ 3 — เอา Supabase Keys

1. ไปที่ **Settings → API**
2. คัดลอก:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon / public key** → `eyJhbGciOiJI...`

### ขั้นที่ 4 — ตั้งค่า .env.local (สำหรับ dev)

```bash
# คัดลอกไฟล์ตัวอย่าง
cp .env.local.example .env.local

# แก้ไขค่า
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

### ขั้นที่ 5 — รันในเครื่อง (ทดสอบก่อน deploy)

```bash
npm install
npm run dev
# เปิด http://localhost:3000
```

### ขั้นที่ 6 — Deploy บน Vercel

#### วิธีที่ 1: ผ่าน GitHub (แนะนำ)

```bash
# 1. สร้าง repo ใน GitHub แล้ว push โค้ด
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/username/fixflow.git
git push -u origin main

# 2. ไปที่ vercel.com → New Project → Import จาก GitHub
# 3. ใส่ Environment Variables ใน Vercel Dashboard:
#    NEXT_PUBLIC_SUPABASE_URL = ...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY = ...
# 4. กด Deploy ✅
```

#### วิธีที่ 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
# ตอบคำถาม แล้วใส่ env vars ตอน deploy
```

### ขั้นที่ 7 — สร้างบัญชี Admin คนแรก

1. เปิดเว็บที่ deploy แล้ว → **สมัครสมาชิก** (ใส่อีเมลและรหัสผ่าน)
2. ไปที่ Supabase Dashboard → **Authentication → Users** → คัดลอก UUID ของ user นั้น
3. ไปที่ **SQL Editor** → รันคำสั่งนี้:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'วาง-uuid-ตรงนี้';
```

4. Logout แล้ว Login ใหม่ → จะเข้า Admin Dashboard อัตโนมัติ ✅

---

## 🔐 ระบบสิทธิ์ (Row Level Security)

| บทบาท | สิทธิ์ |
|-------|--------|
| **User** | เห็นและแก้ไขได้เฉพาะคำร้องของตัวเอง |
| **Admin** | เห็นและจัดการได้ทุกอย่างในระบบ |

---

## 📱 ฟีเจอร์ทั้งหมด

### ผู้ใช้งาน (User)
- ✅ สมัครสมาชิก / เข้าสู่ระบบ
- ✅ แจ้งซ่อมใหม่ (ระบุประเภท, ความสำคัญ, สถานที่, รายละเอียด)
- ✅ ดูรายการคำร้องของตัวเอง พร้อม filter ตามสถานะ
- ✅ ดู Progress Tracker แบบ step-by-step
- ✅ ดู Timeline ประวัติการดำเนินงาน
- ✅ รับหมายเหตุจากช่าง

### แอดมิน (Admin)
- ✅ Dashboard พร้อมสถิติ (ทั้งหมด/รอ/ซ่อม/เสร็จ/เร่งด่วน)
- ✅ ดูคำร้องทั้งหมด + ค้นหา + filter ตามสถานะ
- ✅ อัปเดตสถานะคำร้อง + เพิ่มหมายเหตุ
- ✅ ดู Timeline ประวัติทุก ticket
- ✅ จัดการผู้ใช้ + เปลี่ยน Role (user ↔ admin)

### ระบบ
- ✅ Responsive (คอม + มือถือ)
- ✅ Real-time Supabase
- ✅ Row Level Security
- ✅ Auto-generate ticket number (TK-0001, TK-0002, ...)
- ✅ Auto-log ทุกการเปลี่ยนสถานะ

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (built-in)
- **Deploy**: Vercel
- **Styling**: Pure CSS (ไม่ใช้ framework เพิ่มเติม)

---

## ❓ แก้ปัญหาที่พบบ่อย

**Q: Login แล้วไม่เข้า / วนซ้ำ**  
A: ตรวจสอบว่า `profiles` table มี row ของ user นั้น และ role ถูกต้อง

**Q: "relation does not exist" error**  
A: รัน `supabase_setup.sql` ใน SQL Editor ก่อน

**Q: ไม่ได้รับ confirmation email**  
A: ไปที่ Supabase → Authentication → Settings → ปิด "Enable email confirmations" สำหรับการทดสอบ

**Q: Deploy Vercel แล้ว error 500**  
A: ตรวจสอบ Environment Variables ใน Vercel Dashboard ว่าใส่ครบ
