import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, Calendar, Wand2, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { tasksApi } from '../api/tasks'
import type { Task, Status } from '../types/task'
import { PriorityIcon, StatusLozenge } from './Badge'
import { TaskForm } from './TaskForm'
import { LLMPanel } from './LLMPanel'

const STATUS_CYCLE: Status[] = ['waiting', 'in_progress', 'done']
const PRIORITY_LABELS: Record<string, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' }

interface Props {
  task: Task
  onClose: () => void
}

export function TaskDetail({ task, onClose }: Props) {
  const qc = useQueryClient()
  const [showEdit, setShowEdit]         = useState(false)
  const [showLLM, setShowLLM]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateStatusMut = useMutation({
    mutationFn: (status: Status) => tasksApi.update(task.id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
  })

  const cycleStatus = () => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length]
    updateStatusMut.mutate(next)
  }

  const isOverdue = task.deadline && task.status !== 'done' && isPast(parseISO(task.deadline + 'T23:59:59'))

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />

      <div className="detail-panel">
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-breadcrumb">
            {task.category && (
              <><span className="jira-tag">{task.category}</span><span style={{ color: '#C1C7D0' }}>/</span></>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </span>
          </div>
          <div className="detail-header-actions">
            <button className="btn-ghost" onClick={() => setShowLLM(true)} title="ИИ-ассистент">
              <Wand2 size={15} style={{ color: '#6554C0' }} />
            </button>
            <button className="btn-ghost" onClick={() => setShowEdit(true)} title="Редактировать">
              <Edit2 size={15} />
            </button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(true)} title="Удалить">
              <Trash2 size={15} style={{ color: '#DE350B' }} />
            </button>
            <div style={{ width: 1, height: 20, background: '#DFE1E6', margin: '0 4px' }} />
            <button className="btn-ghost" onClick={onClose} title="Закрыть"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="detail-body">
          {/* Title */}
          <h1 className={`detail-title${task.status === 'done' ? ' done' : ''}`}>{task.title}</h1>

          {/* Meta grid */}
          <div className="detail-meta">
            <div className="detail-meta-row">
              <span className="detail-meta-label">Статус</span>
              <button
                className="detail-status-btn"
                onClick={cycleStatus}
                disabled={updateStatusMut.isPending}
                title="Нажмите чтобы сменить статус"
              >
                <StatusLozenge status={task.status} />
              </button>
            </div>

            <div className="detail-meta-row">
              <span className="detail-meta-label">Приоритет</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PriorityIcon priority={task.priority} size={14} />
                <span style={{ fontSize: 13, color: '#172B4D' }}>{PRIORITY_LABELS[task.priority]}</span>
              </div>
            </div>

            {task.category && (
              <div className="detail-meta-row">
                <span className="detail-meta-label">Категория</span>
                <span className="jira-tag">{task.category}</span>
              </div>
            )}

            <div className="detail-meta-row">
              <span className="detail-meta-label">Срок</span>
              {task.deadline ? (
                <span
                  className={isOverdue ? 'overdue' : ''}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}
                >
                  <Calendar size={13} />
                  {format(parseISO(task.deadline), 'd MMMM yyyy', { locale: ru })}
                  {isOverdue && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
                      <AlertTriangle size={10} /> просрочено
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: '#C1C7D0', fontSize: 13 }}>Не задан</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="detail-section-label">Описание</div>
            {task.description ? (
              <p className="detail-description">{task.description}</p>
            ) : (
              <p style={{ fontSize: 13, color: '#97A0AF', fontStyle: 'italic' }}>Описание не добавлено</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="detail-footer">
          <div className="detail-timestamp">
            <div>Создано: {format(parseISO(task.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}</div>
            <div>Изменено: {format(parseISO(task.updated_at), 'd MMM yyyy, HH:mm', { locale: ru })}</div>
          </div>
          <button className="btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>

      {/* Nested modals */}
      {showEdit && <TaskForm task={task} onClose={() => setShowEdit(false)} />}
      {showLLM  && <LLMPanel task={task} onClose={() => setShowLLM(false)} />}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="dialog-overlay" style={{ zIndex: 60 }} onClick={e => e.target === e.currentTarget && setConfirmDelete(false)}>
          <div className="dialog-box">
            <div className="dialog-header">
              <h2 className="dialog-title" style={{ color: '#DE350B' }}>Удалить задачу?</h2>
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}><X size={18} /></button>
            </div>
            <div className="dialog-body">
              <p style={{ fontSize: 14, color: '#42526E', lineHeight: 1.5 }}>
                Задача <strong>«{task.title}»</strong> будет удалена безвозвратно.
              </p>
            </div>
            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Отмена</button>
              <button
                className="btn-primary"
                style={{ background: '#DE350B' }}
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
