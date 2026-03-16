'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Toast from '@/components/Toast'
import { fmtDate, fmtDateTime, statusBadge, prioBadge } from '@/lib/helpers'

export default function AdminTickets() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState(searchParams.get('s') || '')
  const [selected, setSelected] = useState<any>(null)
  const [toast, setToast]     = useState('')
  const [upd, setUpd]         = useState({ status:'pending', note:'' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function openUpdate(t: any) {
    setUpd({ status: t.status, note: '' })
    const { data } = await supabase.from('tickets').select('*, ticket_logs(*)').eq('id', t.id).single()
    setSelected(data)
  }

  async function saveUpdate() {
    if (!selected) return
    setSaving(true)
    await supabase.from('tickets').update({ status: upd.status, admin_note: upd.note || selected.admin_note }).eq('id', selected.id)
    const msgs: Record<string,string> = {
      pending:'ย้ายกลับเป็น: รอดำเนินการ', progress:'เริ่มดำเนินการซ่อมแล้ว 🔧',
      done:'ซ่อมเสร็จเรียบร้อย ✅', cancel:'ยกเลิกคำร้อง ❌'
    }
    const logLines = []
    if (selected.status !== upd.status) logLines.push(msgs[upd.status])
    if (upd.note) logLines.push('📝 ' + upd.note)
    if (logLines.length) {
      await supabase.from('ticket_logs').insert(logLines.map(msg => ({ ticket_id: selected.id, message: msg, created_by: 'admin' })))
    }
    setSaving(false); setSelected(null); setToast('✅ อัปเดตสำเร็จ')
    await load()
  }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    const matchQ = !q || t.title.toLowerCase().includes(q) || t.ticket_no?.toLowerCase().includes(q) || (t.user_name||'').toLowerCase().includes(q)
    const matchS = !statusF || t.status === statusF
    return matchQ && matchS
  })

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <div className="main">
        <div className="page-head">
          <div><h2>🎫 คำร้องทั้งหมด</h2><p>จัดการและอัปเดตสถานะคำร้องซ่อม</p></div>
          <button className="btn btn-ghost btn-sm" onClick={load}>🔄 รีเฟรช</button>
        </div>

        <div className="search-row">
          <div className="search-box">
            <span className="search-ico">🔍</span>
            <input type="text" placeholder="ค้นหาหัวข้อ, รหัส, ชื่อผู้แจ้ง..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select style={{ width:'auto', minWidth:170 }} value={statusF} onChange={e=>setStatusF(e.target.value)}>
            <option value="">ทุกสถานะ</option>
            <option value="pending">⏳ รอดำเนินการ</option>
            <option value="progress">🔄 กำลังซ่อม</option>
            <option value="done">✅ เสร็จแล้ว</option>
            <option value="cancel">❌ ยกเลิก</option>
          </select>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {loading ? <div className="spinner" style={{ margin:'40px auto' }} /> : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>รหัส</th><th>หัวข้อ</th><th>ผู้แจ้ง</th>
                  <th>ประเภท</th><th>ความสำคัญ</th><th>สถานะ</th><th>วันที่</th><th>จัดการ</th>
                </tr></thead>
                <tbody>
                  {filtered.map(t => {
                    const s = statusBadge(t.status)
                    const p = prioBadge(t.priority)
                    return (
                      <tr key={t.id}>
                        <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)' }}>{t.ticket_no}</td>
                        <td><strong>{t.title}</strong></td>
                        <td style={{ fontSize:13, color:'var(--text2)' }}>{t.user_name || '-'}</td>
                        <td style={{ fontSize:13 }}>{t.type}</td>
                        <td><span className={`badge ${p.cls}`}>{p.lbl}</span></td>
                        <td><span className={`badge ${s.cls}`}>{s.lbl}</span></td>
                        <td style={{ fontSize:12, color:'var(--text2)' }}>{fmtDate(t.created_at)}</td>
                        <td><button className="btn btn-ghost btn-sm" onClick={() => openUpdate(t)}>อัปเดต</button></td>
                      </tr>
                    )
                  })}
                  {!filtered.length && (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>ไม่พบข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {selected && (
        <div className="overlay open" onClick={e => { if(e.target===e.currentTarget) setSelected(null) }}>
          <div className="modal">
            <div className="modal-head">
              <h3 className="modal-h">🛠️ อัปเดตสถานะ</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ background:'var(--surface2)', borderRadius:10, padding:16, marginBottom:20 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)' }}>#{selected.ticket_no}</div>
              <div style={{ fontWeight:600, fontSize:16, marginTop:4 }}>{selected.title}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>👤 {selected.user_name || selected.user_email}</div>
            </div>

            <div className="info-grid" style={{ marginBottom:20 }}>
              <div className="info-item"><div className="lbl">ประเภท</div><div className="val">{selected.type}</div></div>
              <div className="info-item"><div className="lbl">สถานที่</div><div className="val">{selected.location || '-'}</div></div>
              <div className="info-item"><div className="lbl">เบอร์ติดต่อ</div><div className="val">{selected.phone || '-'}</div></div>
              <div className="info-item"><div className="lbl">วันที่แจ้ง</div><div className="val">{fmtDate(selected.created_at)}</div></div>
            </div>

            <div className="form-group">
              <label>รายละเอียด</label>
              <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, background:'var(--surface2)', padding:12, borderRadius:10 }}>{selected.description}</div>
            </div>

            <div className="form-group">
              <label>เปลี่ยนสถานะเป็น</label>
              <select value={upd.status} onChange={e => setUpd({...upd, status:e.target.value})}>
                <option value="pending">⏳ รอดำเนินการ</option>
                <option value="progress">🔄 กำลังซ่อม</option>
                <option value="done">✅ เสร็จแล้ว</option>
                <option value="cancel">❌ ยกเลิก</option>
              </select>
            </div>
            <div className="form-group">
              <label>หมายเหตุ / อัปเดต</label>
              <textarea placeholder="เช่น อยู่ระหว่างรอชิ้นส่วน..." value={upd.note} onChange={e=>setUpd({...upd,note:e.target.value})} />
            </div>

            {(selected.ticket_logs||[]).length > 0 && (
              <div className="form-group">
                <label>ประวัติการดำเนินงาน</label>
                <div className="timeline" style={{ maxHeight:200, overflowY:'auto', paddingRight:4 }}>
                  {[...selected.ticket_logs].sort((a:any,b:any) => new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((l:any) => (
                    <div key={l.id} className="tl-item">
                      <div className="tl-dot" />
                      <div><div className="tl-time">{fmtDateTime(l.created_at)}</div><div className="tl-msg">{l.message}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-end">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{ width:'auto' }} onClick={saveUpdate} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
