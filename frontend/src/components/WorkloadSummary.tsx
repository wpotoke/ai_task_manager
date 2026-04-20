import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
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
    <div className="ai-summary-wrap">
      <button className="ai-summary-header" onClick={handleToggle}>
        <BrainCircuit size={15} style={{ color: '#6554C0', flexShrink: 0 }} />
        <span className="ai-summary-label">Сводка нагрузки</span>
        <span className="ai-badge">ИИ</span>
        {expanded
          ? <ChevronUp size={14} style={{ color: '#97A0AF' }} />
          : <ChevronDown size={14} style={{ color: '#97A0AF' }} />}
      </button>

      {expanded && (
        <div className="ai-summary-body">
          {isFetching && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner size="sm" />
              <span style={{ fontSize: 12, color: '#97A0AF' }}>Анализирую нагрузку...</span>
            </div>
          )}

          {error && (
            <div className="lozenge lozenge-error" style={{ display: 'inline-block', fontSize: 12 }}>
              {(error as Error).message}
            </div>
          )}

          {data && !isFetching && (
            <>
              <p className="ai-summary-text">{data.summary}</p>

              <div className="ai-chips">
                {data.overdue_count > 0 && (
                  <span className="ai-chip red">
                    <AlertTriangle size={11} />
                    {data.overdue_count} просрочено
                  </span>
                )}
                {data.upcoming_count > 0 && (
                  <span className="ai-chip yellow">
                    <Clock size={11} />
                    {data.upcoming_count} на этой неделе
                  </span>
                )}
              </div>

              <div className="ai-dist">
                {Object.entries(data.distribution).map(([k, v]) =>
                  v > 0 ? (
                    <span key={k} className="ai-dist-item">
                      {k === 'high' ? 'Высокий' : k === 'medium' ? 'Средний' : 'Низкий'}: {v}
                    </span>
                  ) : null
                )}
              </div>

              <button
                onClick={() => refetch()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: '#0052CC', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <RefreshCw size={11} />
                Обновить
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
