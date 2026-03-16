'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const MENU = [
  { href:'/admin/dashboard', icon:'📊', label:'Dashboard',       section:'overview' },
  { href:'/admin/tickets',   icon:'🎫', label:'คำร้องทั้งหมด', section:'tickets', countKey:'all' },
  { href:'/admin/tickets?s=pending',  icon:'⏳', label:'รอดำเนินการ', section:'tickets', countKey:'pending' },
  { href:'/admin/tickets?s=progress', icon:'🔄', label:'กำลังซ่อม',   section:'tickets', countKey:'progress' },
  { href:'/admin/tickets?s=done',     icon:'✅', label:'เสร็จแล้ว',   section:'tickets', countKey:'done' },
  { href:'/admin/users',     icon:'👥', label:'ผู้ใช้งาน',     section:'system' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile]   = useState<any>(null)
  const [counts,  setCounts]    = useState({ all:0, pending:0, progress:0, done:0 })
  const [sideOpen, setSideOpen] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!p || p.role !== 'admin') { router.push('/dashboard'); return }
    setProfile(p)

    const { data: tks } = await supabase.from('tickets').select('status')
    if (tks) {
      setCounts({
        all: tks.length,
        pending:  tks.filter((t:any) => t.status==='pending').length,
        progress: tks.filter((t:any) => t.status==='progress').length,
        done:     tks.filter((t:any) => t.status==='done').length,
      })
    }
  }

  const sectionLabels: Record<string,string> = { overview:'Dashboard', tickets:'คำร้อง', system:'ระบบ' }
  let lastSection = ''

  if (!profile) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><div className="spinner" /></div>

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar name={profile.full_name || 'Admin'} role="admin" onHamburger={() => setSideOpen(!sideOpen)} />

      <div className="app-layout">
        <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
          {MENU.map(item => {
            const showSection = item.section !== lastSection
            if (showSection) lastSection = item.section
            const isActive = pathname === item.href || (item.href.includes('?') && pathname+window.location.search === item.href)
            const count = item.countKey ? counts[item.countKey as keyof typeof counts] : undefined

            return (
              <div key={item.href}>
                {showSection && <div className="sidebar-section">{sectionLabels[item.section]}</div>}
                <button
                  className={`nav-item ${pathname===item.href.split('?')[0] && !item.href.includes('?') ? 'active' : ''}`}
                  onClick={() => { router.push(item.href); setSideOpen(false) }}
                >
                  <span className="ni">{item.icon}</span>
                  {item.label}
                  {count !== undefined && <span className="nav-count">{count}</span>}
                </button>
              </div>
            )
          })}
          <div style={{ marginTop:'auto', paddingTop:20 }}>
            <button className="nav-item" onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
              <span className="ni">🚪</span> ออกจากระบบ
            </button>
          </div>
        </aside>

        <div className="app-content">{children}</div>
      </div>
    </div>
  )
}
