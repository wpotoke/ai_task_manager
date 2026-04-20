import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, ListChecks } from 'lucide-react'
import { tasksApi } from './api/tasks'
import type { TaskFilters } from './types/task'
import { TaskCard } from './components/TaskCard'
import { TaskForm } from './components/TaskForm'
import { FilterBar } from './components/FilterBar'
import { WorkloadSummary } from './components/WorkloadSummary'
import { Spinner } from './components/Spinner'

export default function App() {
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters] = useState<TaskFilters>({})

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.list(filters),
    staleTime: 30_000,
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 text-white p-2 rounded-xl">
              <ListChecks size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">AI Task Manager</h1>
              <p className="text-xs text-slate-500">Умный менеджер задач с ИИ-ассистентом</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus size={16} />
            Новая задача
          </button>
        </div>

        <div className="mb-5">
          <WorkloadSummary />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>

        {data && (
          <div className="flex items-center gap-4 mb-5 text-sm text-slate-500">
            <span>
              Найдено: <span className="font-semibold text-slate-700">{data.total}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Выполнено:{' '}
              <span className="font-semibold text-green-600">
                {data.items.filter(t => t.status === 'done').length}
              </span>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              В работе:{' '}
              <span className="font-semibold text-purple-600">
                {data.items.filter(t => t.status === 'in_progress').length}
              </span>
            </span>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            Ошибка загрузки: {(error as Error).message}
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="text-center py-16">
            <ListChecks size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">
              {Object.values(filters).some(Boolean)
                ? 'Нет задач, соответствующих фильтрам'
                : 'Нет задач. Создайте первую!'}
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <TaskForm onClose={() => setShowCreate(false)} />}
    </div>
  )
}
