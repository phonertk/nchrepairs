'use client'
import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
}

export default function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="toast-wrap">
      <div className="toast">{message}</div>
    </div>
  )
}
