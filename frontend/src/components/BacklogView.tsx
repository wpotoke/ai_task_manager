import { ListChecks } from 'lucide-react'
import type { Task } from '../types/task'
import { TaskRow } from './TaskRow'
import { Spinner } from './Spinner'

interface Props {
  tasks: Task[]
  total: number
  isLoading: boolean
  error: Error | null
  hasFilters: boolean
  onTaskOpen: (task: Task) => void
}

export function BacklogView({ tasks, total, isLoading, error, hasFilters, onTaskOpen }: Props) {
  return (
    <div className="backlog-wrap">
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Spinner size="md" />
        </div>
      )}

      {error && (
        <div className="lozenge lozenge-error" style={{ margin: 16, display: 'block', borderRadius: 3 }}>
          Ошибка загрузки: {error.message}
        </div>
      )}

      {!isLoading && !error && tasks.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', gap: 12 }}>
          <ListChecks size={40} style={{ color: '#DFE1E6' }} />
          <p style={{ color: '#97A0AF', fontSize: 14 }}>
            {hasFilters ? 'Нет задач по выбранным фильтрам' : 'Бэклог пуст. Создайте первую задачу.'}
          </p>
        </div>
      )}

      {!isLoading && tasks.length > 0 && (
        <table className="backlog-table">
          <thead className="backlog-thead">
            <tr>
              <th style={{ width: 36, textAlign: 'right' }}>#</th>
              <th style={{ width: 32, textAlign: 'center' }}>P</th>
              <th>Задача</th>
              <th style={{ width: 148 }}>Статус</th>
              <th style={{ width: 112 }}>Срок</th>
              <th style={{ width: 88 }} />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <TaskRow key={task.id} task={task} index={i} onOpen={onTaskOpen} />
            ))}
          </tbody>
        </table>
      )}

      {total > 0 && (
        <div style={{
          padding: '8px 16px',
          fontSize: 12,
          color: '#97A0AF',
          borderTop: '1px solid #F4F5F7',
          background: '#FAFBFC',
        }}>
          Показано {tasks.length} из {total} задач
        </div>
      )}
    </div>
  )
}
