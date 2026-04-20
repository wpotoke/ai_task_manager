import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wand2, X, CheckCircle, ChevronRight } from 'lucide-react'
import { llmApi, tasksApi } from '../api/tasks'
import type { Task, SubTask } from '../types/task'
import type { CategorySuggestion, DecompositionResult, PrioritySuggestion } from '../types/task'
import { Spinner } from './Spinner'
import { PriorityBadge } from './Badge'

interface Props {
  task: Task
  onClose: () => void
}

type LLMMode = 'categorize' | 'decompose' | 'priority'

export function LLMPanel({ task, onClose }: Props) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<LLMMode | null>(null)
  const [result, setResult] = useState<CategorySuggestion | DecompositionResult | PrioritySuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categorizeMut = useMutation({
    mutationFn: () => llmApi.categorize(task.id),
    onSuccess: (data) => { setResult(data); setError(null) },
    onError: (e: Error) => setError(e.message),
  })

  const decomposeMut = useMutation({
    mutationFn: () => llmApi.decompose(task.id),
    onSuccess: (data) => { setResult(data); setError(null) },
    onError: (e: Error) => setError(e.message),
  })

  const priorityMut = useMutation({
    mutationFn: () => llmApi.suggestPriority(task.id),
    onSuccess: (data) => { setResult(data); setError(null) },
    onError: (e: Error) => setError(e.message),
  })

  const applyMut = useMutation({
    mutationFn: (data: Parameters<typeof tasksApi.update>[1]) => tasksApi.update(task.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onClose() },
    onError: (e: Error) => setError(e.message),
  })

  const isLoading = categorizeMut.isPending || decomposeMut.isPending || priorityMut.isPending

  const runMode = (m: LLMMode) => {
    setMode(m)
    setResult(null)
    setError(null)
    if (m === 'categorize') categorizeMut.mutate()
    if (m === 'decompose') decomposeMut.mutate()
    if (m === 'priority') priorityMut.mutate()
  }

  const applyCategory = () => {
    const r = result as CategorySuggestion
    applyMut.mutate({ category: r.category })
  }

  const applyPriority = () => {
    const r = result as PrioritySuggestion
    applyMut.mutate({ priority: r.priority })
  }

  const createSubtasks = async () => {
    const r = result as DecompositionResult
    for (const st of r.subtasks) {
      await tasksApi.create({
        title: st.title,
        description: st.description ?? null,
        priority: task.priority,
        status: 'waiting',
        deadline: task.deadline,
        category: task.category ?? null,
      })
    }
    qc.invalidateQueries({ queryKey: ['tasks'] })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-violet-600" />
            <h2 className="text-base font-semibold text-slate-800">ИИ-ассистент</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <p className="text-sm text-slate-600 font-medium truncate">{task.title}</p>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-slate-100">
          {(
            [
              { key: 'categorize', label: 'Категория' },
              { key: 'priority', label: 'Приоритет' },
              { key: 'decompose', label: 'Подзадачи' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              onClick={() => runMode(btn.key)}
              disabled={isLoading}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors border
                ${mode === btn.key
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[160px]">
          {!mode && (
            <p className="text-sm text-slate-400 text-center mt-8">
              Выберите действие выше, чтобы получить предложение от ИИ
            </p>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 mt-8">
              <Spinner size="md" />
              <p className="text-sm text-slate-400">Анализирую задачу...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          {!isLoading && result && mode === 'categorize' && (
            <CategoryResult
              data={result as CategorySuggestion}
              onApply={applyCategory}
              applying={applyMut.isPending}
            />
          )}

          {!isLoading && result && mode === 'priority' && (
            <PriorityResult
              data={result as PrioritySuggestion}
              onApply={applyPriority}
              applying={applyMut.isPending}
            />
          )}

          {!isLoading && result && mode === 'decompose' && (
            <DecomposeResult
              data={result as DecompositionResult}
              onApply={createSubtasks}
              applying={applyMut.isPending}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function CategoryResult({ data, onApply, applying }: {
  data: CategorySuggestion; onApply: () => void; applying: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium">
          {data.category}
        </span>
      </div>
      <p className="text-sm text-slate-600">{data.reasoning}</p>
      <button
        onClick={onApply}
        disabled={applying}
        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
      >
        <CheckCircle size={14} />
        {applying ? 'Применяю...' : 'Применить категорию'}
      </button>
    </div>
  )
}

function PriorityResult({ data, onApply, applying }: {
  data: PrioritySuggestion; onApply: () => void; applying: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Предложенный приоритет:</span>
        <PriorityBadge priority={data.priority} />
      </div>
      <p className="text-sm text-slate-600">{data.reasoning}</p>
      <button
        onClick={onApply}
        disabled={applying}
        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
      >
        <CheckCircle size={14} />
        {applying ? 'Применяю...' : 'Применить приоритет'}
      </button>
    </div>
  )
}

function DecomposeResult({ data, onApply, applying }: {
  data: DecompositionResult; onApply: () => void; applying: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{data.reasoning}</p>
      <ul className="space-y-2">
        {data.subtasks.map((st: SubTask, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <ChevronRight size={14} className="text-violet-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-slate-700">{st.title}</span>
              {st.description && (
                <p className="text-slate-500 text-xs mt-0.5">{st.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={onApply}
        disabled={applying}
        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
      >
        <CheckCircle size={14} />
        {applying ? 'Создаю...' : `Создать ${data.subtasks.length} подзадачи`}
      </button>
    </div>
  )
}
