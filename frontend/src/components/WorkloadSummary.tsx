import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, ChevronDown, ChevronUp, AlertTriangle, Clock } from 'lucide-react'
import { llmApi } from '../api/tasks'
import { Spinner } from './Spinner'

export function WorkloadSummary() {
  const [expanded, setExpanded] = useState(false)

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['workload-summary'],
    queryFn: llmApi.workloadSummary,
    enabled: false,
    retry: false,
  })

  const handleToggle = () => {
    if (!expanded && !data) refetch()
    setExpanded(e => !e)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-violet-600" />
          <span className="text-sm font-semibold text-slate-700">Сводка нагрузки (ИИ)</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-100">
          {isFetching && (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="sm" />
              <span className="text-sm text-slate-400">Анализирую нагрузку...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mt-3">
              {(error as Error).message}
            </div>
          )}

          {data && !isFetching && (
            <div className="space-y-3 pt-3">
              <p className="text-sm text-slate-700 leading-relaxed">{data.summary}</p>

              <div className="flex gap-3">
                {data.overdue_count > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg">
                    <AlertTriangle size={13} />
                    <span className="text-xs font-medium">{data.overdue_count} просрочено</span>
                  </div>
                )}
                {data.upcoming_count > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg">
                    <Clock size={13} />
                    <span className="text-xs font-medium">{data.upcoming_count} на этой неделе</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 text-xs">
                {Object.entries(data.distribution).map(([k, v]) => (
                  v > 0 && (
                    <span key={k} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {k === 'high' ? 'Высокий' : k === 'medium' ? 'Средний' : 'Низкий'}: {v}
                    </span>
                  )
                ))}
              </div>

              <button
                onClick={() => refetch()}
                className="text-xs text-violet-600 hover:text-violet-800 transition-colors"
              >
                Обновить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
