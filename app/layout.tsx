import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FixFlow — ระบบแจ้งซ่อม',
  description: 'ระบบแจ้งซ่อมและติดตามสถานะออนไลน์',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
