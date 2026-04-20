import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { tasksApi } from '../api/tasks'
import type { Task, TaskCreate, TaskUpdate, Priority, Status } from '../types/task'

interface Props {
  task?: Task
  onClose: () => void
}

const defaultForm: TaskCreate = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'waiting',
  deadline: null,
  category: '',
}

export function TaskForm({ task, onClose }: Props) {
  const qc = useQueryClient()
  const isEdit = !!task

  const [form, setForm] = useState<TaskCreate>({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? 'waiting',
    deadline: task?.deadline ?? null,
    category: task?.category ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (data: TaskUpdate) => tasksApi.update(task!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const payload = {
      ...form,
      description: form.description || null,
      deadline: form.deadline || null,
      category: form.category || null,
    }
    if (isEdit) {
      updateMut.mutate(payload)
    } else {
      createMut.mutate(payload)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Название задачи"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              placeholder="Подробное описание (необязательно)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Приоритет</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="waiting">Ожидает</option>
                <option value="in_progress">В работе</option>
                <option value="done">Готово</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Срок</label>
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value || null }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Категория</label>
              <input
                type="text"
                value={form.category ?? ''}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="напр. Разработка"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
