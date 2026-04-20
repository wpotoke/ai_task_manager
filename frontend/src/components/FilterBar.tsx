import { Search, X } from 'lucide-react'
import type { TaskFilters } from '../types/task'

interface Props {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
}

export function FilterBar({ filters, onChange }: Props) {
  const set = (key: keyof TaskFilters, val: string) =>
    onChange({ ...filters, [key]: val || undefined })

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="filter-bar">
      <div className="filter-search">
        <Search size={13} className="filter-search-icon" />
        <input
          type="text"
          value={filters.search ?? ''}
          onChange={e => set('search', e.target.value)}
          placeholder="Поиск задач..."
        />
      </div>

      <select
        className={`filter-select${filters.status ? ' active' : ''}`}
        value={filters.status ?? ''}
        onChange={e => set('status', e.target.value)}
      >
        <option value="">Все статусы</option>
        <option value="waiting">К выполнению</option>
        <option value="in_progress">В работе</option>
        <option value="done">Готово</option>
      </select>

      <select
        className={`filter-select${filters.priority ? ' active' : ''}`}
        value={filters.priority ?? ''}
        onChange={e => set('priority', e.target.value)}
      >
        <option value="">Все приоритеты</option>
        <option value="high">Высокий</option>
        <option value="medium">Средний</option>
        <option value="low">Низкий</option>
      </select>

      <input
        type="date"
        className="filter-date"
        value={filters.deadline_before ?? ''}
        onChange={e => set('deadline_before', e.target.value)}
        title="Срок до..."
      />

      {hasFilters && (
        <button className="filter-clear" onClick={() => onChange({})}>
          <X size={12} />
          Сбросить
        </button>
      )}
    </div>
  )
}
