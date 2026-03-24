'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Toast from '@/components/Toast'
import { fmtDate, fmtDateTime, statusBadge, prioBadge } from '@/lib/helpers'

async function notifyTelegram(message: string) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
  } catch {}
}

type Ticket = any
type Profile = { id: string; full_name: string; role: string }

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile]   = useState<Profile|null>(null)
  const [tickets, setTickets]   = useState<Ticket[]>([])
  const [filter, setFilter]     = useState('all')
  const [view, setView]         = useState<'list'|'new'>('list')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Ticket|null>(null)
  const [toast, setToast]       = useState('')
  const [sideOpen, setSideOpen] = useState(false)

  // New ticket form
  const [nt, setNt] = useState({ title:'', type:'', priority:'med', location:'', desc:'', phone:'' })
  const [ntErr, setNtErr] = useState('')
  const [ntLoading, setNtLoading] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!p) { router.push('/login'); return }
    if (p.role === 'admin') { router.push('/admin/dashboard'); return }
    setProfile(p)
    await fetchTickets(session.user.id)
    setLoading(false)
  }

  async function fetchTickets(uid: string) {
    const { data } = await supabase
      .from('tickets')
      .select('*, ticket_logs(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setTickets(data || [])
  }

  async function submitTicket() {
    if (!nt.title || !nt.type || !nt.desc) { setNtErr('กรุณากรอกข้อมูลที่จำเป็น (หัวข้อ, ประเภท, รายละเอียด)'); return }
    setNtErr(''); setNtLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    const { data: tkt, error } = await supabase.from('tickets').insert({
      user_id: session!.user.id,
      user_name: profile!.full_name,
      user_email: session!.user.email,
      title: nt.title, type: nt.type, priority: nt.priority,
      location: nt.location, description: nt.desc, phone: nt.phone, status: 'pending'
    }).select().single()

    if (error) { setNtErr('ส่งคำร้องล้มเหลว: ' + error.message); setNtLoading(false); return }

    await supabase.from('ticket_logs').insert({
      ticket_id: tkt.id, message: 'รับคำร้องแล้ว รอการดำเนินการ', created_by: 'system'
    })

    // แจ้งเตือน Telegram
    const prioLabel: Record<string,string> = { high:'🔴 เร่งด่วน', med:'🟡 ปานกลาง', low:'🟢 ปกติ' }
    await notifyTelegram(
`🔧 <b>คำร้องซ่อมใหม่!</b>
━━━━━━━━━━━━━━━
🎫 รหัส: <b>${tkt.ticket_no}</b>
📌 หัวข้อ: ${tkt.title}
🔩 ประเภท: ${tkt.type}
📍 สถานที่: ${tkt.location || 'ไม่ระบุ'}
⚡ ความสำคัญ: ${prioLabel[tkt.priority] || tkt.priority}
👤 ผู้แจ้ง: ${profile!.full_name}
━━━━━━━━━━━━━━━
กรุณาตรวจสอบใน Admin Dashboard`
    )

    setNt({ title:'', type:'', priority:'med', location:'', desc:'', phone:'' })
    setNtLoading(false)
    setToast('✅ ส่งคำร้องเรียบร้อยแล้ว!')
    await fetchTickets(session!.user.id)
    setView('list')
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  async function openDetail(t: Ticket) {
    const { data } = await supabase.from('tickets').select('*, ticket_logs(*)').eq('id', t.id).single()
    setSelected(data)
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><div className="spinner" /></div>

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        <Navbar name={profile?.full_name || 'ผู้ใช้'} role="user" onHamburger={() => setSideOpen(!sideOpen)} />

        <div className="app-layout">
          {/* Sidebar */}
          <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
            <div className="sidebar-section">เมนู</div>
            <button className={`nav-item ${view==='list'?'active':''}`} onClick={() => { setView('list'); setSideOpen(false) }}>
              <span className="ni">🎫</span> คำร้องของฉัน
            </button>
            <button className={`nav-item ${view==='new'?'active':''}`} onClick={() => { setView('new'); setSideOpen(false) }}>
              <span className="ni">➕</span> แจ้งซ่อมใหม่
            </button>
            <div style={{ marginTop:'auto', paddingTop:20 }}>
              <button className="nav-item" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
                <span className="ni">🚪</span> ออกจากระบบ
              </button>
            </div>
          </aside>

          <div className="app-content">
            <div className="main">

              {/* ── LIST VIEW ── */}
              {view === 'list' && (
                <>
                  <div className="page-head">
                    <div><h2>🎫 คำร้องซ่อมของฉัน</h2><p>ติดตามสถานะการซ่อมทั้งหมด</p></div>
                    <button className="btn btn-primary" style={{ width:'auto' }} onClick={() => setView('new')}>➕ แจ้งซ่อมใหม่</button>
                  </div>

                  <div className="chips">
                    {[['all','ทั้งหมด'],['pending','⏳ รอดำเนินการ'],['progress','🔄 กำลังซ่อม'],['done','✅ เสร็จแล้ว']].map(([f,l]) => (
                      <button key={f} className={`chip ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{l}</button>
                    ))}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="empty"><div className="empty-ico">🎫</div><h3>ไม่มีคำร้อง</h3><p>ยังไม่มีคำร้องในหมวดนี้</p></div>
                  ) : (
                    <div style={{ display:'grid', gap:12 }}>
                      {filtered.map(t => {
                        const { cls, lbl } = statusBadge(t.status)
                        const pr = prioBadge(t.priority)
                        return (
                          <div key={t.id} className={`tcard`} onClick={() => openDetail(t)}>
                            <div className={`tcard-stripe stripe-${t.status}`} />
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                              <span className="tcard-id">#{t.ticket_no}</span>
                              <span className={`badge ${cls}`}>{lbl}</span>
                            </div>
                            <div className="tcard-title">{t.title}</div>
                            <div className="tcard-meta">
                              <span>🔧 {t.type}</span>
                              <span>📍 {t.location || 'ไม่ระบุ'}</span>
                              <span>📅 {fmtDate(t.created_at)}</span>
                              <span className={`badge ${pr.cls}`}>{pr.lbl}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── NEW TICKET VIEW ── */}
              {view === 'new' && (
                <>
                  <div className="page-head"><div><h2>➕ แจ้งซ่อมใหม่</h2><p>กรอกรายละเอียดปัญหาที่พบ</p></div></div>
                  <div className="card">
                    {ntErr && <div className="alert alert-err">❌ {ntErr}</div>}
                    <div className="form-group">
                      <label>หัวข้อปัญหา *</label>
                      <input type="text" placeholder="เช่น เครื่องปริ้นไม่ทำงาน" value={nt.title} onChange={e=>setNt({...nt,title:e.target.value})} />
                    </div>
                    <div className="grid2">
                      <div className="form-group">
                        <label>ประเภทอุปกรณ์ *</label>
                        <select value={nt.type} onChange={e=>setNt({...nt,type:e.target.value})}>
                          <option value="">เลือกประเภท</option>
                          {['คอมพิวเตอร์','เครื่องพิมพ์','เครือข่าย/อินเทอร์เน็ต','โทรศัพท์','แอร์','ไฟฟ้า','อื่น ๆ'].map(o => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>ลำดับความสำคัญ</label>
                        <select value={nt.priority} onChange={e=>setNt({...nt,priority:e.target.value})}>
                          <option value="low">🟢 ปกติ</option>
                          <option value="med">🟡 ปานกลาง</option>
                          <option value="high">🔴 เร่งด่วน</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>สถานที่ / ห้อง</label>
                      <input type="text" placeholder="เช่น ห้อง 204 ชั้น 2" value={nt.location} onChange={e=>setNt({...nt,location:e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>รายละเอียดปัญหา *</label>
                      <textarea placeholder="อธิบายอาการที่พบ..." value={nt.desc} onChange={e=>setNt({...nt,desc:e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>เบอร์โทรติดต่อ</label>
                      <input type="tel" placeholder="08x-xxx-xxxx" value={nt.phone} onChange={e=>setNt({...nt,phone:e.target.value})} />
                    </div>
                    <div className="flex-end">
                      <button className="btn btn-ghost" onClick={() => setView('list')}>ยกเลิก</button>
                      <button className="btn btn-primary" style={{ width:'auto' }} onClick={submitTicket} disabled={ntLoading}>
                        {ntLoading ? 'กำลังส่ง...' : 'ส่งคำร้อง →'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TICKET DETAIL MODAL ── */}
      {selected && (
        <div className="overlay open" onClick={e => { if(e.target===e.currentTarget) setSelected(null) }}>
          <div className="modal">
            <div className="modal-head">
              <div>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginBottom:4 }}>#{selected.ticket_no}</div>
                <div className="modal-h">{selected.title}</div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ marginBottom:16 }}>
              <span className={`badge ${statusBadge(selected.status).cls}`}>{statusBadge(selected.status).lbl}</span>
            </div>

            {/* Progress tracker */}
            <div className="tracker">
              {['รับคำร้อง','กำลังดำเนินการ','ซ่อมเสร็จ'].map((s,i) => {
                const si = selected.status==='pending'?0:selected.status==='progress'?1:selected.status==='done'?2:-1
                const cls = (selected.status==='done'&&i<=2) ? 'done' : i<si ? 'done' : i===si&&si>=0 ? 'active' : ''
                return (
                  <div key={s} className={`track-step ${cls}`}>
                    <div className="track-dot">{(selected.status==='done'||i<si)?'✓':i===si&&si>=0?'›':i+1}</div>
                    <div className="track-lbl">{s}</div>
                  </div>
                )
              })}
            </div>

            <div className="info-grid">
              <div className="info-item"><div className="lbl">ประเภท</div><div className="val">{selected.type}</div></div>
              <div className="info-item"><div className="lbl">ความสำคัญ</div><div className="val"><span className={`badge ${prioBadge(selected.priority).cls}`}>{prioBadge(selected.priority).lbl}</span></div></div>
              <div className="info-item"><div className="lbl">สถานที่</div><div className="val">{selected.location||'ไม่ระบุ'}</div></div>
              <div className="info-item"><div className="lbl">วันที่แจ้ง</div><div className="val">{fmtDate(selected.created_at)}</div></div>
            </div>

            <div className="form-group">
              <label>รายละเอียด</label>
              <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, background:'var(--surface2)', padding:14, borderRadius:10 }}>
                {selected.description}
              </div>
            </div>

            <div className="form-group">
              <label>ความคืบหน้า</label>
              <div className="timeline">
                {(selected.ticket_logs||[]).sort((a:any,b:any) => new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((l:any) => (
                  <div key={l.id} className="tl-item">
                    <div className="tl-dot" />
                    <div>
                      <div className="tl-time">{fmtDateTime(l.created_at)}</div>
                      <div className="tl-msg">{l.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selected.admin_note && (
              <div className="alert alert-info">
                <span>💬</span>
                <div><strong>หมายเหตุจากช่าง:</strong><br />{selected.admin_note}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
