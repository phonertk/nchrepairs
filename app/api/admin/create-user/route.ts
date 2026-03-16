import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ใช้ service_role key (server-side เท่านั้น ไม่ expose ให้ browser)
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: Request) {
  try {
    const { username, full_name, phone, department, role, password } = await req.json()

    if (!username || !full_name || !password) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })
    }

    const sb = adminClient()

    // สร้าง email จำลองจาก username
    const email = `${username}@internal.local`

    // สร้าง user ใน Supabase Auth
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ไม่ต้องยืนยัน email
      user_metadata: { username, full_name, role }
    })

    if (error) {
      // email ซ้ำ = username ซ้ำ
      if (error.message.includes('already')) {
        return NextResponse.json({ error: 'Username นี้ถูกใช้แล้ว' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // upsert profile (trigger อาจสร้างให้แล้ว แต่ update ข้อมูลเพิ่มเติม)
    await sb.from('profiles').upsert({
      id: data.user.id,
      username,
      full_name,
      phone: phone || '',
      department: department || '',
      role,
    })

    return NextResponse.json({ success: true, user_id: data.user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
