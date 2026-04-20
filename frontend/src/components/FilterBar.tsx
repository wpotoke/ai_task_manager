import { Search, X } from 'lucide-react'
import type { TaskFilters, Priority, Status } from '../types/task'

interface Props {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
}

export function FilterBar({ filters, onChange }: Props) {
  const set = (key: keyof TaskFilters, val: string) => {
    onChange({ ...filters, [key]: val || undefined })
  }

  const clear = () => onChange({})
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-48">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search ?? ''}
          onChange={e => set('search', e.target.value)}
          placeholder="Поиск по названию или описанию..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <select
        value={filters.status ?? ''}
        onChange={e => set('status', e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      >
        <option value="">Все статусы</option>
        <option value="waiting">Ожидает</option>
        <option value="in_progress">В работе</option>
        <option value="done">Готово</option>
      </select>

      <select
        value={filters.priority ?? ''}
        onChange={e => set('priority', e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
      >
        <option value="">Все приоритеты</option>
        <option value="high">Высокий</option>
        <option value="medium">Средний</option>
        <option value="low">Низкий</option>
      </select>

      <input
        type="date"
        value={filters.deadline_before ?? ''}
        onChange={e => set('deadline_before', e.target.value)}
        title="Срок до..."
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      />

      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-500 transition-colors"
        >
          <X size={14} />
          Сбросить
        </button>
      )}
    </div>
  )
}
