import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { tasksApi } from './api/tasks'
import type { Task, TaskFilters, Status } from './types/task'
import { Sidebar } from './components/Sidebar'
import { FilterBar } from './components/FilterBar'
import { BacklogView } from './components/BacklogView'
import { KanbanBoard } from './components/KanbanBoard'
import { TaskForm } from './components/TaskForm'
import { TaskDetail } from './components/TaskDetail'
import { WorkloadSummary } from './components/WorkloadSummary'

type View = 'backlog' | 'board'

export default function App() {
  const [view, setView]               = useState<View>('backlog')
  const [filters, setFilters]         = useState<TaskFilters>({})
  const [createStatus, setCreateStatus] = useState<Status | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.list(filters),
    staleTime: 30_000,
  })

  const tasks        = data?.items ?? []
  const hasFilters   = Object.values(filters).some(Boolean)
  const selectedTask = selectedTaskId ? (tasks.find(t => t.id === selectedTaskId) ?? null) : null

  return (
    <div className="jira-layout">
      <Sidebar view={view} onViewChange={setView} />

      <div className="jira-main">
        {/* Top bar */}
        <header className="jira-topbar">
          <div className="topbar-breadcrumb">
            <span className="topbar-breadcrumb-link">AI Task Manager</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-breadcrumb-active">
              {view === 'backlog' ? 'Бэклог' : 'Доска'}
            </span>
          </div>

          {data && (
            <div className="topbar-stats">
              <span>Всего: <span className="topbar-stats-val">{data.total}</span></span>
              <span className="topbar-sep">|</span>
              <span>В работе: <span className="topbar-stats-val blue">{tasks.filter(t => t.status === 'in_progress').length}</span></span>
              <span className="topbar-sep">|</span>
              <span>Готово: <span className="topbar-stats-val green">{tasks.filter(t => t.status === 'done').length}</span></span>
            </div>
          )}

          <button className="btn-primary" onClick={() => setCreateStatus('waiting')}>
            <Plus size={15} />
            Создать
          </button>
        </header>

        {/* Content */}
        <div className="jira-content">
          {/* Page heading */}
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#172B4D', marginBottom: 16 }}>
            {view === 'backlog' ? 'Бэклог' : 'Доска задач'}
          </h1>

          {/* AI Summary */}
          <div style={{ marginBottom: 16 }}>
            <WorkloadSummary />
          </div>

          {/* Filters — backlog only */}
          {view === 'backlog' && (
            <div style={{ background: 'white', border: '1px solid #DFE1E6', borderRadius: 3, padding: '10px 14px', marginBottom: 16 }}>
              <FilterBar filters={filters} onChange={setFilters} />
            </div>
          )}

          {/* Views */}
          {view === 'backlog' ? (
            <BacklogView
              tasks={tasks}
              total={data?.total ?? 0}
              isLoading={isLoading}
              error={error as Error | null}
              hasFilters={hasFilters}
              onTaskOpen={(t: Task) => setSelectedTaskId(t.id)}
            />
          ) : (
            <KanbanBoard
              tasks={tasks}
              isLoading={isLoading}
              onCreateInStatus={s => setCreateStatus(s)}
              onTaskOpen={(t: Task) => setSelectedTaskId(t.id)}
            />
          )}
        </div>
      </div>

      {createStatus !== null && (
        <TaskForm defaultStatus={createStatus} onClose={() => setCreateStatus(null)} />
      )}

      {selectedTask !== null && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  )
}
