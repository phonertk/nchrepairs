export function fmtDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2,'0')
  const mon = (d.getMonth()+1).toString().padStart(2,'0')
  const yr  = d.getFullYear() + 543
  return `${day}/${mon}/${yr}`
}

export function fmtDateTime(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  const hr  = d.getHours().toString().padStart(2,'0')
  const min = d.getMinutes().toString().padStart(2,'0')
  return `${fmtDate(iso)} ${hr}:${min}`
}

export function statusBadge(s: string) {
  const m: Record<string,string[]> = {
    pending:  ['b-pending',  '⏳ รอดำเนินการ'],
    progress: ['b-progress', '🔄 กำลังซ่อม'],
    done:     ['b-done',     '✅ เสร็จแล้ว'],
    cancel:   ['b-cancel',   '❌ ยกเลิก'],
  }
  const [cls, lbl] = m[s] || ['', s]
  return { cls, lbl }
}

export function prioBadge(p: string) {
  const m: Record<string,string[]> = {
    high: ['b-high', '🔴 เร่งด่วน'],
    med:  ['b-med',  '🟡 ปานกลาง'],
    low:  ['b-low',  '🟢 ปกติ'],
  }
  const [cls, lbl] = m[p] || ['b-low','ปกติ']
  return { cls, lbl }
}
