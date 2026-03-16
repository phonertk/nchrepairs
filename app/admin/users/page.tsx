'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Toast from '@/components/Toast'
import { fmtDate } from '@/lib/helpers'

export default function AdminUsers() {
  const supabase = createClient()
  const [users, setUsers]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState('')
  const [search, setSearch]     = useState('')

  // Modal: สร้าง user ใหม่
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [createErr, setCreateErr]   = useState('')
  const [newUser, setNewUser]       = useState({
    username: '', full_name: '', phone: '', department: '', role: 'user', password: ''
  })

  // Modal: เปลี่ยน role / รีเซ็ตรหัสผ่าน
  const [selected, setSelected]   = useState<any>(null)
  const [editRole, setEditRole]   = useState('user')
  const [editPass, setEditPass]   = useState('')
  const [editInfo, setEditInfo]   = useState({ full_name:'', phone:'', department:'' })
  const [saving, setSaving]       = useState(false)

  // Modal: ยืนยันลบ
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  // ── สร้าง user ใหม่ผ่าน Supabase Admin API (server-side route) ──
  async function createUser() {
    const { username, full_name, password, role } = newUser
    if (!username.trim() || !full_name.trim() || !password) {
      setCreateErr('กรุณากรอก Username, ชื่อ-นามสกุล และรหัสผ่าน'); return
    }
    if (password.length < 6) { setCreateErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }

    // ตรวจ username ซ้ำ
    const exists = users.find(u => u.username?.toLowerCase() === username.trim().toLowerCase())
    if (exists) { setCreateErr('Username นี้ถูกใช้แล้ว'); return }

    setCreating(true); setCreateErr('')

    // เรียก API route ที่สร้าง user ด้วย service_role key
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        full_name: full_name.trim(),
        phone: newUser.phone,
        department: newUser.department,
        role,
        password
      })
    })

    const json = await res.json()
    if (!res.ok) {
      setCreateErr(json.error || 'สร้างบัญชีล้มเหลว')
      setCreating(false); return
    }

    setCreating(false)
    setShowCreate(false)
    setNewUser({ username:'', full_name:'', phone:'', department:'', role:'user', password:'' })
    setToast(`✅ สร้างบัญชี "${username}" เรียบร้อย`)
    await load()
  }

  // ── แก้ไข user ──
  async function saveEdit() {
    if (!selected) return
    setSaving(true)

    const updates: any = {
      role: editRole,
      full_name: editInfo.full_name,
      phone: editInfo.phone,
      department: editInfo.department,
    }
    await supabase.from('profiles').update(updates).eq('id', selected.id)

    // เปลี่ยนรหัสผ่านถ้ากรอก
    if (editPass.trim().length >= 6) {
      await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selected.id, password: editPass.trim() })
      })
    }

    setSaving(false); setSelected(null); setEditPass('')
    setToast('✅ อัปเดตข้อมูลเรียบร้อย')
    await load()
  }

  // ── ลบ user ──
  async function deleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: deleteTarget.id })
    })
    setDeleting(false); setDeleteTarget(null)
    setToast(`🗑️ ลบบัญชี "${deleteTarget.username}" แล้ว`)
    await load()
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.username?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.department?.toLowerCase().includes(q)
  })

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <div className="main">
        <div className="page-head flex-between">
          <div>
            <h2>👥 จัดการผู้ใช้งาน</h2>
            <p>สร้างและจัดการบัญชีผู้ใช้ทั้งหมดในระบบ</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost btn-sm" onClick={load}>🔄 รีเฟรช</button>
            <button className="btn btn-primary btn-sm" style={{ width:'auto' }} onClick={() => { setShowCreate(true); setCreateErr('') }}>
              ➕ สร้างบัญชีใหม่
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', marginBottom:20 }}>
          <div className="stat-card sc-blue"><div className="stat-num">{users.length}</div><div className="stat-lbl">ผู้ใช้ทั้งหมด</div></div>
          <div className="stat-card sc-purple"><div className="stat-num">{users.filter(u=>u.role==='admin').length}</div><div className="stat-lbl">แอดมิน</div></div>
          <div className="stat-card sc-green"><div className="stat-num">{users.filter(u=>u.role==='user').length}</div><div className="stat-lbl">ผู้ใช้ทั่วไป</div></div>
        </div>

        <div className="search-row">
          <div className="search-box">
            <span className="search-ico">🔍</span>
            <input type="text" placeholder="ค้นหา username, ชื่อ, แผนก..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {loading ? <div className="spinner" style={{ margin:'40px auto' }} /> : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Username</th><th>ชื่อ-นามสกุล</th><th>แผนก</th>
                  <th>เบอร์โทร</th><th>Role</th><th>วันที่สร้าง</th><th>จัดการ</th>
                </tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--accent)', background:'rgba(59,130,246,0.08)', padding:'3px 8px', borderRadius:6 }}>
                          {u.username}
                        </span>
                      </td>
                      <td><strong>{u.full_name || '-'}</strong></td>
                      <td style={{ fontSize:13, color:'var(--text2)' }}>{u.department || '-'}</td>
                      <td style={{ fontSize:13, color:'var(--text2)' }}>{u.phone || '-'}</td>
                      <td>
                        <span className={`badge ${u.role==='admin' ? 'b-admin' : 'b-user'}`}>
                          {u.role==='admin' ? '🛠️ Admin' : '👤 User'}
                        </span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text2)' }}>{fmtDate(u.created_at)}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => {
                            setSelected(u)
                            setEditRole(u.role)
                            setEditPass('')
                            setEditInfo({ full_name: u.full_name||'', phone: u.phone||'', department: u.department||'' })
                          }}>✏️ แก้ไข</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(u)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>
                      {users.length === 0 ? 'ยังไม่มีผู้ใช้ในระบบ' : 'ไม่พบข้อมูล'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ══ Modal: สร้าง User ใหม่ ══ */}
      {showCreate && (
        <div className="overlay open" onClick={e => { if(e.target===e.currentTarget) setShowCreate(false) }}>
          <div className="modal">
            <div className="modal-head">
              <h3 className="modal-h">➕ สร้างบัญชีผู้ใช้ใหม่</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            {createErr && <div className="alert alert-err">❌ {createErr}</div>}
            <div className="grid2">
              <div className="form-group">
                <label>Username *</label>
                <input type="text" placeholder="เช่น john.doe" value={newUser.username}
                  onChange={e=>setNewUser({...newUser, username:e.target.value.replace(/\s/g,'')})} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={newUser.role} onChange={e=>setNewUser({...newUser, role:e.target.value})}>
                  <option value="user">👤 User</option>
                  <option value="admin">🛠️ Admin</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>ชื่อ-นามสกุล *</label>
              <input type="text" placeholder="สมชาย ใจดี" value={newUser.full_name}
                onChange={e=>setNewUser({...newUser, full_name:e.target.value})} />
            </div>
            <div className="grid2">
              <div className="form-group">
                <label>เบอร์โทร</label>
                <input type="tel" placeholder="08x-xxx-xxxx" value={newUser.phone}
                  onChange={e=>setNewUser({...newUser, phone:e.target.value})} />
              </div>
              <div className="form-group">
                <label>แผนก / ฝ่าย</label>
                <input type="text" placeholder="เช่น ฝ่ายบัญชี" value={newUser.department}
                  onChange={e=>setNewUser({...newUser, department:e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>รหัสผ่าน *</label>
              <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={newUser.password}
                onChange={e=>setNewUser({...newUser, password:e.target.value})} />
            </div>
            <div className="alert alert-info" style={{ marginBottom:4 }}>
              ℹ️ ผู้ใช้จะ Login ด้วย <strong>username: {newUser.username||'...'}</strong> และรหัสผ่านที่ตั้งนี้
            </div>
            <div className="flex-end">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ width:'auto' }} onClick={createUser} disabled={creating}>
                {creating ? 'กำลังสร้าง...' : 'สร้างบัญชี →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: แก้ไข User ══ */}
      {selected && (
        <div className="overlay open" onClick={e => { if(e.target===e.currentTarget) setSelected(null) }}>
          <div className="modal">
            <div className="modal-head">
              <h3 className="modal-h">✏️ แก้ไขบัญชีผู้ใช้</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ background:'var(--surface2)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--accent)' }}>{selected.username}</span>
            </div>
            <div className="form-group">
              <label>ชื่อ-นามสกุล</label>
              <input type="text" value={editInfo.full_name} onChange={e=>setEditInfo({...editInfo,full_name:e.target.value})} />
            </div>
            <div className="grid2">
              <div className="form-group">
                <label>เบอร์โทร</label>
                <input type="tel" value={editInfo.phone} onChange={e=>setEditInfo({...editInfo,phone:e.target.value})} />
              </div>
              <div className="form-group">
                <label>แผนก</label>
                <input type="text" value={editInfo.department} onChange={e=>setEditInfo({...editInfo,department:e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={editRole} onChange={e=>setEditRole(e.target.value)}>
                <option value="user">👤 User</option>
                <option value="admin">🛠️ Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)</label>
              <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={editPass}
                onChange={e=>setEditPass(e.target.value)} />
            </div>
            <div className="flex-end">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ width:'auto' }} onClick={saveEdit} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal: ยืนยันลบ ══ */}
      {deleteTarget && (
        <div className="overlay open" onClick={e => { if(e.target===e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-head">
              <h3 className="modal-h">🗑️ ยืนยันการลบ</h3>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div style={{ fontSize:15, marginBottom:20, lineHeight:1.7 }}>
              คุณต้องการลบบัญชี <strong style={{ color:'var(--accent)' }}>{deleteTarget.username}</strong> ({deleteTarget.full_name}) ใช่หรือไม่?<br/>
              <span style={{ fontSize:13, color:'var(--red)' }}>⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้</span>
            </div>
            <div className="flex-end">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
              <button className="btn btn-danger" onClick={deleteUser} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : '🗑️ ลบบัญชี'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
