import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { format, isPast, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Plus, Wand2, Edit2, Trash2, Calendar } from 'lucide-react'
import { tasksApi } from '../api/tasks'
import type { Task, Status } from '../types/task'
import { PriorityIcon } from './Badge'
import { TaskForm } from './TaskForm'
import { LLMPanel } from './LLMPanel'
import { Spinner } from './Spinner'

interface Props {
  tasks: Task[]
  isLoading: boolean
  onCreateInStatus: (status: Status) => void
  onTaskOpen: (task: Task) => void
}

const COLUMNS: { status: Status; label: string; titleColor: string; dotColor: string }[] = [
  { status: 'waiting',     label: 'К ВЫПОЛНЕНИЮ', titleColor: '#42526E', dotColor: '#DFE1E6' },
  { status: 'in_progress', label: 'В РАБОТЕ',     titleColor: '#0052CC', dotColor: '#0052CC' },
  { status: 'done',        label: 'ГОТОВО',        titleColor: '#006644', dotColor: '#57D9A3' },
]

export function KanbanBoard({ tasks, isLoading, onCreateInStatus, onTaskOpen }: Props) {
  const qc = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const moveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as Status
    const task = tasks.find(t => t.id === active.id)
    if (task && task.status !== newStatus) {
      moveMut.mutate({ id: String(active.id), status: newStatus })
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            col={col}
            tasks={tasks.filter(t => t.status === col.status)}
            onCreateInStatus={onCreateInStatus}
            onTaskOpen={onTaskOpen}
          />
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({
  col, tasks, onCreateInStatus, onTaskOpen,
}: {
  col: (typeof COLUMNS)[number]
  tasks: Task[]
  onCreateInStatus: (s: Status) => void
  onTaskOpen: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status })

  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.dotColor, display: 'inline-block', flexShrink: 0 }} />
        <span className="kanban-col-title" style={{ color: col.titleColor }}>{col.label}</span>
        <span className="kanban-col-count">{tasks.length}</span>
        <button
          className="btn-ghost kanban-col-add"
          onClick={() => onCreateInStatus(col.status)}
          title="Создать задачу"
        >
          <Plus size={14} />
        </button>
      </div>
      <div ref={setNodeRef} className={`kanban-body${isOver ? ' over' : ''}`}>
        {tasks.map(task => <KanbanCard key={task.id} task={task} onOpen={onTaskOpen} />)}
        {tasks.length === 0 && (
          <div className="kanban-empty">Нет задач</div>
        )}
      </div>
    </div>
  )
}

function KanbanCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const qc = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [showLLM, setShowLLM]   = useState(false)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

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
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`kanban-card${isDragging ? ' dragging' : ''}`}
        onClick={() => onOpen(task)}
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
      >
        <div className="kanban-card-top">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {task.category && <span className="jira-tag">{task.category}</span>}
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button
              className="btn-ghost"
              onClick={e => { e.stopPropagation(); setShowLLM(true) }}
              title="ИИ-ассистент"
            >
              <Wand2 size={12} style={{ color: '#6554C0' }} />
            </button>
            <button
              className="btn-ghost"
              onClick={e => { e.stopPropagation(); setShowEdit(true) }}
              title="Редактировать"
            >
              <Edit2 size={12} />
            </button>
            <button
              className="btn-ghost"
              onClick={e => { e.stopPropagation(); if (confirm('Удалить?')) deleteMut.mutate() }}
              title="Удалить"
            >
              <Trash2 size={12} style={{ color: '#DE350B' }} />
            </button>
          </div>
        </div>

        <div className={`kanban-card-title${task.status === 'done' ? ' done' : ''}`}>
          {task.title}
        </div>

        <div className="kanban-card-bottom">
          <PriorityIcon priority={task.priority} size={14} />
          {task.deadline && (
            <span
              className={isOverdue ? 'overdue' : ''}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: isOverdue ? '#DE350B' : '#6B778C' }}
            >
              <Calendar size={10} />
              {format(parseISO(task.deadline), 'd MMM', { locale: ru })}
            </span>
          )}
        </div>
      </div>

      {showEdit && <TaskForm task={task} onClose={() => setShowEdit(false)} />}
      {showLLM  && <LLMPanel task={task} onClose={() => setShowLLM(false)} />}
    </>
  )
}
