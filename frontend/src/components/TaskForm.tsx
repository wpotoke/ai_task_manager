import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { tasksApi } from '../api/tasks'
import type { Task, TaskCreate, TaskUpdate, Priority, Status } from '../types/task'
import { PriorityIcon } from './Badge'

interface Props {
  task?: Task
  defaultStatus?: Status
  onClose: () => void
}

export function TaskForm({ task, defaultStatus, onClose }: Props) {
  const qc = useQueryClient()
  const isEdit = !!task

  const [form, setForm] = useState<TaskCreate>({
    title:       task?.title       ?? '',
    description: task?.description ?? '',
    priority:    task?.priority    ?? 'medium',
    status:      task?.status      ?? defaultStatus ?? 'waiting',
    deadline:    task?.deadline    ?? null,
    category:    task?.category    ?? '',
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
    const payload = { ...form, description: form.description || null, deadline: form.deadline || null, category: form.category || null }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload)
  }

  return (
    <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog-box">
        {/* Header */}
        <div className="dialog-header">
          <h2 className="dialog-title">{isEdit ? 'Редактировать задачу' : 'Создать задачу'}</h2>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            {error && (
              <div className="lozenge lozenge-error" style={{ padding: '8px 12px', borderRadius: 3, display: 'block', fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="field-label">
                Название <span style={{ color: '#DE350B' }}>*</span>
              </label>
              <input
                className="field-input"
                type="text"
                required
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Название задачи"
              />
            </div>

            {/* Description */}
            <div>
              <label className="field-label">Описание</label>
              <textarea
                className="field-textarea"
                rows={3}
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Добавьте описание..."
              />
            </div>

            {/* Priority picker */}
            <div>
              <label className="field-label">Приоритет</label>
              <div className="priority-picker">
                {(['high', 'medium', 'low'] as Priority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`priority-option${form.priority === p ? ' selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                  >
                    <PriorityIcon priority={p} size={18} />
                    {p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-grid-2">
              {/* Status */}
              <div>
                <label className="field-label">Статус</label>
                <select
                  className="field-select"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                >
                  <option value="waiting">К выполнению</option>
                  <option value="in_progress">В работе</option>
                  <option value="done">Готово</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="field-label">Категория</label>
                <input
                  className="field-input"
                  type="text"
                  value={form.category ?? ''}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="напр. DevOps"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="field-label">Срок выполнения</label>
              <input
                className="field-input"
                type="date"
                value={form.deadline ?? ''}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value || null }))}
                style={{ width: 'auto' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="dialog-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
