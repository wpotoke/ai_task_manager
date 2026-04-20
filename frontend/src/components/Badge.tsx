import type { Priority, Status } from '../types/task'

export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  if (priority === 'high') return (
    <span className="priority-icon" title="Высокий">
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 2L15 13H1L8 2Z" fill="#DE350B" />
      </svg>
    </span>
  )
  if (priority === 'medium') return (
    <span className="priority-icon" title="Средний">
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4.5" width="12" height="3" rx="1.5" fill="#FF991F" />
        <rect x="2" y="9"   width="12" height="3" rx="1.5" fill="#FF991F" />
      </svg>
    </span>
  )
  return (
    <span className="priority-icon" title="Низкий">
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 14L1 3H15L8 14Z" fill="#2684FF" />
      </svg>
    </span>
  )
}

export function StatusLozenge({ status }: { status: Status }) {
  const cls = status === 'done' ? 'lozenge lozenge-done'
    : status === 'in_progress' ? 'lozenge lozenge-inprog'
    : 'lozenge lozenge-default'
  const label = status === 'done' ? 'Готово'
    : status === 'in_progress' ? 'В работе'
    : 'К выполнению'
  return <span className={cls}>{label}</span>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const label = priority === 'high' ? 'Высокий' : priority === 'medium' ? 'Средний' : 'Низкий'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <PriorityIcon priority={priority} size={13} />
      <span style={{ fontSize: 12, color: '#42526E' }}>{label}</span>
    </span>
  )
}
