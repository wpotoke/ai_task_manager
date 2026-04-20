import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wand2, X, CheckCircle, ChevronRight } from 'lucide-react'
import { llmApi, tasksApi } from '../api/tasks'
import type { Task, SubTask, CategorySuggestion, DecompositionResult, PrioritySuggestion } from '../types/task'
import { Spinner } from './Spinner'
import { PriorityBadge } from './Badge'

interface Props {
  task: Task
  onClose: () => void
}

type LLMMode = 'categorize' | 'decompose' | 'priority'

const MODES: { key: LLMMode; label: string }[] = [
  { key: 'categorize', label: 'Категория' },
  { key: 'priority',   label: 'Приоритет' },
  { key: 'decompose',  label: 'Подзадачи' },
]

export function LLMPanel({ task, onClose }: Props) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<LLMMode | null>(null)
  const [result, setResult] = useState<CategorySuggestion | DecompositionResult | PrioritySuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categorizeMut = useMutation({ mutationFn: () => llmApi.categorize(task.id),      onSuccess: d => { setResult(d); setError(null) }, onError: (e: Error) => setError(e.message) })
  const decomposeMut  = useMutation({ mutationFn: () => llmApi.decompose(task.id),       onSuccess: d => { setResult(d); setError(null) }, onError: (e: Error) => setError(e.message) })
  const priorityMut   = useMutation({ mutationFn: () => llmApi.suggestPriority(task.id), onSuccess: d => { setResult(d); setError(null) }, onError: (e: Error) => setError(e.message) })
  const applyMut      = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.update>[1]) => tasksApi.update(task.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const isLoading = categorizeMut.isPending || decomposeMut.isPending || priorityMut.isPending

  const runMode = (m: LLMMode) => {
    setMode(m); setResult(null); setError(null)
    if (m === 'categorize') categorizeMut.mutate()
    if (m === 'decompose')  decomposeMut.mutate()
    if (m === 'priority')   priorityMut.mutate()
  }

  const createSubtasks = async () => {
    const r = result as DecompositionResult
    for (const st of r.subtasks) {
      await tasksApi.create({ title: st.title, description: st.description ?? null, priority: task.priority, status: 'waiting', deadline: task.deadline, category: task.category ?? null })
    }
    qc.invalidateQueries({ queryKey: ['tasks'] })
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dialog-box">
        {/* Header */}
        <div className="dialog-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={16} style={{ color: '#6554C0' }} />
            <h2 className="dialog-title">ИИ-ассистент</h2>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Task name */}
        <div style={{ padding: '8px 20px', background: '#F4F5F7', borderBottom: '1px solid #DFE1E6', fontSize: 13, color: '#42526E', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </div>

        {/* Tabs */}
        <div className="llm-tabs">
          {MODES.map(btn => (
            <button
              key={btn.key}
              className={`llm-tab${mode === btn.key ? ' active' : ''}`}
              onClick={() => runMode(btn.key)}
              disabled={isLoading}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="llm-body">
          {!mode && <p className="llm-empty">Выберите действие выше</p>}

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 32 }}>
              <Spinner size="md" />
              <span style={{ fontSize: 13, color: '#97A0AF' }}>Анализирую задачу...</span>
            </div>
          )}

          {error && (
            <div className="lozenge lozenge-error" style={{ display: 'block', padding: '8px 12px', borderRadius: 3, fontSize: 13 }}>
              {error}
            </div>
          )}

          {!isLoading && result && mode === 'categorize' && (
            <CategoryResult data={result as CategorySuggestion} onApply={() => applyMut.mutate({ category: (result as CategorySuggestion).category })} applying={applyMut.isPending} />
          )}
          {!isLoading && result && mode === 'priority' && (
            <PriorityResult data={result as PrioritySuggestion} onApply={() => applyMut.mutate({ priority: (result as PrioritySuggestion).priority })} applying={applyMut.isPending} />
          )}
          {!isLoading && result && mode === 'decompose' && (
            <DecomposeResult data={result as DecompositionResult} onApply={createSubtasks} applying={applyMut.isPending} />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 20px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function CategoryResult({ data, onApply, applying }: { data: CategorySuggestion; onApply: () => void; applying: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="jira-tag" style={{ fontSize: 13, padding: '4px 10px' }}>{data.category}</span>
      <p style={{ fontSize: 13, color: '#42526E', lineHeight: 1.5 }}>{data.reasoning}</p>
      <button className="btn-primary" onClick={onApply} disabled={applying} style={{ alignSelf: 'flex-start', gap: 6 }}>
        <CheckCircle size={13} />
        {applying ? 'Применяю...' : 'Применить категорию'}
      </button>
    </div>
  )
}

function PriorityResult({ data, onApply, applying }: { data: PrioritySuggestion; onApply: () => void; applying: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#6B778C' }}>Рекомендуемый приоритет:</span>
        <PriorityBadge priority={data.priority} />
      </div>
      <p style={{ fontSize: 13, color: '#42526E', lineHeight: 1.5 }}>{data.reasoning}</p>
      <button className="btn-primary" onClick={onApply} disabled={applying} style={{ alignSelf: 'flex-start', gap: 6 }}>
        <CheckCircle size={13} />
        {applying ? 'Применяю...' : 'Применить приоритет'}
      </button>
    </div>
  )
}

function DecomposeResult({ data, onApply, applying }: { data: DecompositionResult; onApply: () => void; applying: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#97A0AF', lineHeight: 1.4 }}>{data.reasoning}</p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0 }}>
        {data.subtasks.map((st: SubTask, i: number) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
            <ChevronRight size={13} style={{ color: '#6554C0', flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontWeight: 500, color: '#172B4D' }}>{st.title}</span>
              {st.description && <p style={{ fontSize: 12, color: '#6B778C', marginTop: 2 }}>{st.description}</p>}
            </div>
          </li>
        ))}
      </ul>
      <button className="btn-primary" onClick={onApply} disabled={applying} style={{ alignSelf: 'flex-start', gap: 6 }}>
        <CheckCircle size={13} />
        {applying ? 'Создаю...' : `Создать ${data.subtasks.length} подзадачи`}
      </button>
    </div>
  )
}
