'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Toast from '@/components/Toast'
import { fmtDate, fmtDateTime, statusBadge, prioBadge } from '@/lib/helpers'

export default function AdminDashboard() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [upd, setUpd] = useState({ status:'pending', note:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending:false })
    setTickets(data || [])
    setLoading(false)
  }

  const stats = {
    all:      tickets.length,
    pending:  tickets.filter(t=>t.status==='pending').length,
    progress: tickets.filter(t=>t.status==='progress').length,
    done:     tickets.filter(t=>t.status==='done').length,
    high:     tickets.filter(t=>t.priority==='high').length,
  }

  async function openUpdate(t: any) {
    setUpd({ status: t.status, note:'' })
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

    setSaving(false)
    setSelected(null)
    setToast('✅ อัปเดตสำเร็จ')
    await load()
  }

  const recent = tickets.slice(0, 7)

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <div className="main">
        <div className="page-head flex-between">
          <div><h2>📊 Dashboard</h2><p>ภาพรวมระบบแจ้งซ่อม</p></div>
          <button className="btn btn-ghost btn-sm" onClick={load}>🔄 รีเฟรช</button>
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            <div className="stats-grid">
              <div className="stat-card sc-blue"><div className="stat-num">{stats.all}</div><div className="stat-lbl">คำร้องทั้งหมด</div></div>
              <div className="stat-card sc-yellow"><div className="stat-num">{stats.pending}</div><div className="stat-lbl">รอดำเนินการ</div></div>
              <div className="stat-card sc-blue"><div className="stat-num">{stats.progress}</div><div className="stat-lbl">กำลังซ่อม</div></div>
              <div className="stat-card sc-green"><div className="stat-num">{stats.done}</div><div className="stat-lbl">เสร็จแล้ว</div></div>
              <div className="stat-card sc-red"><div className="stat-num">{stats.high}</div><div className="stat-lbl">เร่งด่วน</div></div>
            </div>

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'20px 24px 0', fontWeight:700, fontSize:15 }}>📋 คำร้องล่าสุด</div>
              <div className="table-wrap">
                <table>
                  <thead><tr>
                    <th>รหัส</th><th>หัวข้อ</th><th>ผู้แจ้ง</th>
                    <th>ประเภท</th><th>สถานะ</th><th>วันที่</th><th></th>
                  </tr></thead>
                  <tbody>
                    {recent.map(t => {
                      const { cls, lbl } = statusBadge(t.status)
                      return (
                        <tr key={t.id}>
                          <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)' }}>{t.ticket_no}</td>
                          <td><strong>{t.title}</strong></td>
                          <td style={{ fontSize:13, color:'var(--text2)' }}>{t.user_name || t.user_email || '-'}</td>
                          <td style={{ fontSize:13 }}>{t.type}</td>
                          <td><span className={`badge ${cls}`}>{lbl}</span></td>
                          <td style={{ fontSize:12, color:'var(--text2)' }}>{fmtDate(t.created_at)}</td>
                          <td><button className="btn btn-ghost btn-sm" onClick={() => openUpdate(t)}>อัปเดต</button></td>
                        </tr>
                      )
                    })}
                    {!recent.length && (
                      <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>ยังไม่มีข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
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
              <textarea placeholder="เช่น อยู่ระหว่างรอชิ้นส่วน, ซ่อมเสร็จแล้ว..." value={upd.note} onChange={e=>setUpd({...upd,note:e.target.value})} />
            </div>
            {/* Timeline preview */}
            {selected.ticket_logs?.length > 0 && (
              <div className="form-group">
                <label>ประวัติ</label>
                <div className="timeline" style={{ maxHeight:180, overflowY:'auto' }}>
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
