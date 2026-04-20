import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Edit2, Trash2, Wand2, Tag } from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { tasksApi } from '../api/tasks'
import type { Task, Status } from '../types/task'
import { PriorityBadge, StatusBadge } from './Badge'
import { TaskForm } from './TaskForm'
import { LLMPanel } from './LLMPanel'

interface Props {
  task: Task
}

const statusOptions: { value: Status; label: string }[] = [
  { value: 'waiting', label: 'Ожидает' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Готово' },
]

export function TaskCard({ task }: Props) {
  const qc = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [showLLM, setShowLLM] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMut = useMutation({
    mutationFn: (status: Status) => tasksApi.update(task.id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const isOverdue =
    task.deadline &&
    task.status !== 'done' &&
    isPast(parseISO(task.deadline + 'T23:59:59'))

  return (
    <>
      <div className={`bg-white rounded-xl border transition-all hover:shadow-md ${
        task.status === 'done'
          ? 'border-slate-100 opacity-75'
          : isOverdue
          ? 'border-red-200'
          : 'border-slate-200'
      }`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`text-sm font-semibold leading-snug ${
              task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
            }`}>
              {task.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowLLM(true)}
                title="ИИ-ассистент"
                className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
              >
                <Wand2 size={14} />
              </button>
              <button
                onClick={() => setShowEdit(true)}
                title="Редактировать"
                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                title="Удалить"
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.category && (
              <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-2 py-0.5 rounded text-xs font-medium">
                <Tag size={10} />
                {task.category}
              </span>
            )}
            {task.deadline && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
              }`}>
                <Calendar size={10} />
                {format(parseISO(task.deadline), 'd MMM', { locale: ru })}
                {isOverdue && ' (просрочено)'}
              </span>
            )}
          </div>

          <select
            value={task.status}
            onChange={e => updateMut.mutate(e.target.value as Status)}
            disabled={updateMut.isPending}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white text-slate-600"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {confirmDelete && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 rounded-lg p-3 text-sm">
              <p className="text-red-700 font-medium mb-2">Удалить задачу?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                  className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors disabled:opacity-60"
                >
                  {deleteMut.isPending ? 'Удаляю...' : 'Удалить'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-1 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEdit && <TaskForm task={task} onClose={() => setShowEdit(false)} />}
      {showLLM && <LLMPanel task={task} onClose={() => setShowLLM(false)} />}
    </>
  )
}
