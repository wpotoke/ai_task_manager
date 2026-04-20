import { clsx } from 'clsx'
import type { Priority, Status } from '../types/task'

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Низкий', className: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Средний', className: 'bg-amber-100 text-amber-700' },
  high: { label: 'Высокий', className: 'bg-red-100 text-red-700' },
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  waiting: { label: 'Ожидает', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В работе', className: 'bg-purple-100 text-purple-700' },
  done: { label: 'Готово', className: 'bg-green-100 text-green-700' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority]
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status]
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}
