import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Wand2, Edit2, Trash2, Calendar } from 'lucide-react'
import { tasksApi } from '../api/tasks'
import type { Task, Status } from '../types/task'
import { PriorityIcon, StatusLozenge } from './Badge'
import { TaskForm } from './TaskForm'
import { LLMPanel } from './LLMPanel'

const STATUS_CYCLE: Status[] = ['waiting', 'in_progress', 'done']

export function TaskRow({ task, index, onOpen }: { task: Task; index: number; onOpen: (t: Task) => void }) {
  const qc = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [showLLM, setShowLLM] = useState(false)

  const updateStatus = useMutation({
    mutationFn: (status: Status) => tasksApi.update(task.id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length]
    updateStatus.mutate(next)
  }

  const isOverdue =
    task.deadline &&
    task.status !== 'done' &&
    isPast(parseISO(task.deadline + 'T23:59:59'))

  return (
    <>
      <tr className="backlog-row">
        <td className="num"><span className="row-num">{index + 1}</span></td>

        <td className="pri">
          <PriorityIcon priority={task.priority} size={14} />
        </td>

        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`task-title${task.status === 'done' ? ' done' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
              onClick={() => onOpen(task)}
            >
              {task.title}
            </button>
            {task.category && (
              <span className="jira-tag">{task.category}</span>
            )}
          </div>
          {task.description && (
            <div className="task-desc">{task.description}</div>
          )}
        </td>

        <td>
          <button
            onClick={cycleStatus}
            disabled={updateStatus.isPending}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            title="Нажмите чтобы сменить статус"
          >
            <StatusLozenge status={task.status} />
          </button>
        </td>

        <td>
          {task.deadline ? (
            <span
              className={isOverdue ? 'overdue' : ''}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <Calendar size={11} />
              {format(parseISO(task.deadline), 'd MMM', { locale: ru })}
              {isOverdue && <span style={{ fontWeight: 700 }}>!</span>}
            </span>
          ) : (
            <span style={{ color: '#C1C7D0', fontSize: 12 }}>—</span>
          )}
        </td>

        <td className="actions">
          <div className="row-actions">
            <button className="btn-ghost" onClick={() => setShowLLM(true)} title="ИИ-ассистент">
              <Wand2 size={13} style={{ color: '#6554C0' }} />
            </button>
            <button className="btn-ghost" onClick={() => setShowEdit(true)} title="Редактировать">
              <Edit2 size={13} />
            </button>
            <button
              className="btn-ghost"
              onClick={() => { if (confirm('Удалить задачу?')) deleteMut.mutate() }}
              title="Удалить"
            >
              <Trash2 size={13} style={{ color: '#DE350B' }} />
            </button>
          </div>
        </td>
      </tr>

      {showEdit && <TaskForm task={task} onClose={() => setShowEdit(false)} />}
      {showLLM  && <LLMPanel task={task} onClose={() => setShowLLM(false)} />}
    </>
  )
}
