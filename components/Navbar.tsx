'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface NavbarProps {
  name: string
  role: 'user' | 'admin'
  onHamburger?: () => void
}

export default function Navbar({ name, role, onHamburger }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="navbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {onHamburger && (
          <button className="hamburger" onClick={onHamburger}>☰</button>
        )}
        <a href={role==='admin' ? '/admin/dashboard' : '/dashboard'} className="nav-brand">
          <div className="brand-icon">🔧</div>
          <div className="brand-name">
            FixFlow
            {role==='admin' && (
              <span style={{ fontSize:10, background:'rgba(59,130,246,0.15)', color:'var(--accent)', padding:'2px 8px', borderRadius:4, marginLeft:8 }}>
                Admin
              </span>
            )}
          </div>
        </a>
      </div>
      <div className="nav-right">
        <div className="user-badge">
          <div className={`avt ${role==='admin' ? 'avt-green' : 'avt-blue'}`}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span>{name}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>ออกจากระบบ</button>
      </div>
    </nav>
  )
}
