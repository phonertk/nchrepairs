'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // ── Login state ──
  const [liUser, setLiUser] = useState('')
  const [liPass, setLiPass] = useState('')
  const [liErr,  setLiErr]  = useState('')
  const [liLoad, setLiLoad] = useState(false)

  // ── Register state ──
  const [rg, setRg] = useState({ username:'', full_name:'', phone:'', department:'', password:'' })
  const [rgErr,  setRgErr]  = useState('')
  const [rgOk,   setRgOk]   = useState(false)
  const [rgLoad, setRgLoad] = useState(false)

  // ── Login ──
  async function doLogin() {
    if (!liUser.trim() || !liPass) { setLiErr('กรุณากรอก Username และรหัสผ่าน'); return }
    setLiLoad(true); setLiErr('')

    const email = `${liUser.trim().toLowerCase()}@internal.local`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: liPass })

    if (error) { setLiErr('Username หรือรหัสผ่านไม่ถูกต้อง'); setLiLoad(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    router.push(profile?.role === 'admin' ? '/admin/dashboard' : '/dashboard')
  }

  // ── Register ──
  async function doRegister() {
    const { username, full_name, phone, department, password } = rg
    if (!username.trim()) { setRgErr('กรุณากรอก Username'); return }
    if (!full_name.trim()) { setRgErr('กรุณากรอกชื่อ-นามสกุล'); return }
    if (!password)         { setRgErr('กรุณากรอกรหัสผ่าน'); return }
    if (password.length < 6) { setRgErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
      setRgErr('Username ใช้ได้เฉพาะ a-z, 0-9, . _ -'); return
    }

    setRgLoad(true); setRgErr('')

    // ตรวจ username ซ้ำก่อน
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', username.trim().toLowerCase()).maybeSingle()
    if (existing) { setRgErr('Username นี้ถูกใช้แล้ว กรุณาเลือก Username อื่น'); setRgLoad(false); return }

    const email = `${username.trim().toLowerCase()}@internal.local`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim().toLowerCase(), full_name: full_name.trim(), role: 'user' } }
    })

    if (error) {
      const msg = error.message.includes('already') ? 'Username นี้ถูกใช้แล้ว' : error.message
      setRgErr(msg); setRgLoad(false); return
    }

    // upsert profile พร้อมข้อมูลเพิ่มเติม
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.trim().toLowerCase(),
        full_name: full_name.trim(),
        phone: phone.trim(),
        department: department.trim(),
        role: 'user',
      })
    }

    setRgLoad(false)
    setRgOk(true)
    setRg({ username:'', full_name:'', phone:'', department:'', password:'' })
  }

  function switchTab(t: 'login' | 'register') {
    setTab(t); setLiErr(''); setRgErr(''); setRgOk(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
      position: 'relative', overflow: 'hidden'
    }}>
      {/* bg orbs */}
      <div style={{ position:'absolute', width:520, height:520, borderRadius:'50%', background:'rgba(59,130,246,0.07)', filter:'blur(90px)', top:-160, left:-160, pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:420, height:420, borderRadius:'50%', background:'rgba(139,92,246,0.06)', filter:'blur(80px)', bottom:-120, right:-100, pointerEvents:'none' }} />

      <div className="card fade-up" style={{ width:'100%', maxWidth:440, boxShadow:'var(--shadow)' }}>

        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <div className="brand-icon" style={{ width:46, height:46, fontSize:22 }}>🔧</div>
          <div>
            <div className="brand-name" style={{ fontSize:24 }}>FixFlow</div>
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>ระบบแจ้งซ่อมออนไลน์</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'var(--surface2)', borderRadius:10, padding:4, gap:4, marginBottom:26 }}>
          {(['login','register'] as const).map((t, i) => (
            <button key={t} onClick={() => switchTab(t)}
              className="btn" style={{
                flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600,
                background: tab===t ? 'var(--accent)' : 'transparent',
                color: tab===t ? '#fff' : 'var(--text2)',
                boxShadow: tab===t ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                transition: 'all 0.2s'
              }}>
              {i===0 ? '🔐 เข้าสู่ระบบ' : '📝 สมัครสมาชิก'}
            </button>
          ))}
        </div>

        {/* ─────────── LOGIN FORM ─────────── */}
        {tab === 'login' && (
          <div>
            {liErr && <div className="alert alert-err" style={{ marginBottom:16 }}>❌ {liErr}</div>}

            <div className="form-group">
              <label>Username</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}>👤</span>
                <input type="text" placeholder="กรอก username ของคุณ"
                  value={liUser} onChange={e => setLiUser(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && doLogin()}
                  style={{ paddingLeft:40 }} autoComplete="username" autoFocus />
              </div>
            </div>

            <div className="form-group">
              <label>รหัสผ่าน</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}>🔑</span>
                <input type="password" placeholder="••••••••"
                  value={liPass} onChange={e => setLiPass(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && doLogin()}
                  style={{ paddingLeft:40 }} autoComplete="current-password" />
              </div>
            </div>

            <button className="btn btn-primary btn-block" onClick={doLogin} disabled={liLoad}
              style={{ marginTop:8, fontSize:15, padding:'13px' }}>
              {liLoad ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
            </button>

            <div style={{ marginTop:20, padding:'13px 16px', background:'var(--surface2)', borderRadius:10, fontSize:13, color:'var(--text2)', display:'flex', gap:9 }}>
              <span>ℹ️</span><span>หากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ</span>
            </div>
          </div>
        )}

        {/* ─────────── REGISTER FORM ─────────── */}
        {tab === 'register' && (
          <div>
            {rgErr && <div className="alert alert-err" style={{ marginBottom:14 }}>❌ {rgErr}</div>}
            {rgOk  && (
              <div className="alert alert-ok" style={{ marginBottom:14 }}>
                ✅ สมัครสำเร็จ! สามารถ <button onClick={() => switchTab('login')}
                  style={{ background:'none', border:'none', color:'var(--green)', fontWeight:700, cursor:'pointer', fontSize:14, textDecoration:'underline' }}>
                  เข้าสู่ระบบ
                </button> ได้เลย
              </div>
            )}

            {!rgOk && (
              <>
                {/* Username */}
                <div className="form-group">
                  <label>Username <span style={{ color:'var(--red)' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}>@</span>
                    <input type="text" placeholder="เช่น somchai.j (a-z, 0-9, . _ -)"
                      value={rg.username}
                      onChange={e => setRg({...rg, username: e.target.value.replace(/\s/g,'').toLowerCase()})}
                      style={{ paddingLeft:36 }} autoComplete="off" />
                  </div>
                  {rg.username && !/^[a-zA-Z0-9._-]+$/.test(rg.username) && (
                    <div style={{ fontSize:11, color:'var(--red)', marginTop:5 }}>ใช้ได้เฉพาะ a-z, 0-9, . _ -</div>
                  )}
                </div>

                {/* ชื่อ-นามสกุล */}
                <div className="form-group">
                  <label>ชื่อ-นามสกุล <span style={{ color:'var(--red)' }}>*</span></label>
                  <input type="text" placeholder="สมชาย ใจดี"
                    value={rg.full_name} onChange={e => setRg({...rg, full_name:e.target.value})} />
                </div>

                {/* เบอร์โทร + แผนก */}
                <div className="grid2">
                  <div className="form-group">
                    <label>เบอร์โทร</label>
                    <input type="tel" placeholder="08x-xxx-xxxx"
                      value={rg.phone} onChange={e => setRg({...rg, phone:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>แผนก / ฝ่าย</label>
                    <input type="text" placeholder="เช่น ฝ่ายบัญชี"
                      value={rg.department} onChange={e => setRg({...rg, department:e.target.value})} />
                  </div>
                </div>

                {/* รหัสผ่าน */}
                <div className="form-group">
                  <label>รหัสผ่าน <span style={{ color:'var(--red)' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}>🔑</span>
                    <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={rg.password} onChange={e => setRg({...rg, password:e.target.value})}
                      onKeyDown={e => e.key==='Enter' && doRegister()}
                      style={{ paddingLeft:40 }} />
                  </div>
                  {rg.password && rg.password.length < 6 && (
                    <div style={{ fontSize:11, color:'var(--yellow)', marginTop:5 }}>ยังไม่ถึง 6 ตัวอักษร</div>
                  )}
                </div>

                <button className="btn btn-primary btn-block" onClick={doRegister} disabled={rgLoad}
                  style={{ fontSize:15, padding:'13px' }}>
                  {rgLoad ? 'กำลังสมัคร...' : 'สมัครสมาชิก →'}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:18, fontSize:11, color:'var(--text3)' }}>
          🔒 ข้อมูลของคุณปลอดภัย — ขับเคลื่อนโดย Supabase
        </div>
      </div>
    </div>
  )
}
