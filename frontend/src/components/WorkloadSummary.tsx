import { useState, useRef, useEffect, useCallback } from 'react'
import { BrainCircuit, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import type { WorkloadSummary } from '../types/task'
import { Spinner } from './Spinner'

const STREAM_URL = '/api/v1/llm/workload-summary/stream'

export function WorkloadSummary() {
  const [expanded, setExpanded]       = useState(false)
  const [streamText, setStreamText]   = useState('')
  const [result, setResult]           = useState<WorkloadSummary | null>(null)
  const [isStreaming, setIsStreaming]  = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const esRef        = useRef<EventSource | null>(null)
  const hasContent   = useRef(false)  // track if any token arrived (for error handling)

  // ── Stream control ──────────────────────────────────────────────────────

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const startStream = useCallback(() => {
    closeStream()
    setStreamText('')
    setResult(null)
    setError(null)
    setIsStreaming(true)
    hasContent.current = false

    const es = new EventSource(STREAM_URL)
    esRef.current = es

    // Text token from LLM stream
    es.addEventListener('token', (e: MessageEvent) => {
      hasContent.current = true
      const { text } = JSON.parse(e.data) as { text: string }
      setStreamText(prev => prev + text)
    })

    // Stream complete (or cache hit — summary already in data)
    es.addEventListener('done', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as WorkloadSummary
      setResult(data)
      // If served from cache, no tokens were emitted — set text directly
      setStreamText(prev => prev || data.summary)
      setIsStreaming(false)
      es.close()
      esRef.current = null
    })

    // Server-side LLM error
    es.addEventListener('llmerror', (e: MessageEvent) => {
      const { detail } = JSON.parse(e.data) as { detail: string }
      setError(detail)
      setIsStreaming(false)
      es.close()
      esRef.current = null
    })

    // Network / connection error
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        if (!hasContent.current) {
          setError('Не удалось подключиться к серверу')
        }
        setIsStreaming(false)
        esRef.current = null
      }
    }
  }, [closeStream])

  // Close stream when panel collapses
  useEffect(() => {
    if (!expanded) closeStream()
  }, [expanded, closeStream])

  // Cleanup on unmount
  useEffect(() => () => closeStream(), [closeStream])

  // ── Toggle ──────────────────────────────────────────────────────────────

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    // Auto-start stream on first open, or if we don't have a result yet
    if (next && !result && !isStreaming) {
      startStream()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const showCacheHint = result?.from_cache === true

  return (
    <div className="ai-summary-wrap">
      <button className="ai-summary-header" onClick={handleToggle}>
        <BrainCircuit size={15} style={{ color: '#6554C0', flexShrink: 0 }} />
        <span className="ai-summary-label">Сводка нагрузки</span>
        <span className="ai-badge">ИИ</span>
        {isStreaming && <Spinner size="sm" />}
        {expanded
          ? <ChevronUp size={14} style={{ color: '#97A0AF' }} />
          : <ChevronDown size={14} style={{ color: '#97A0AF' }} />}
      </button>

      {expanded && (
        <div className="ai-summary-body">

          {/* Error state */}
          {error && (
            <div className="lozenge lozenge-error" style={{ display: 'inline-block', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Loading (before first token) */}
          {isStreaming && !streamText && !error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner size="sm" />
              <span style={{ fontSize: 12, color: '#97A0AF' }}>Анализирую нагрузку...</span>
            </div>
          )}

          {/* Streaming text or cached text */}
          {streamText && !error && (
            <>
              <p className="ai-summary-text">
                {streamText}
                {isStreaming && <span className="ai-cursor">▌</span>}
              </p>

              {/* Stats — show only after stream completes */}
              {result && !isStreaming && (
                <>
                  <div className="ai-chips">
                    {result.overdue_count > 0 && (
                      <span className="ai-chip red">
                        <AlertTriangle size={11} />
                        {result.overdue_count} просрочено
                      </span>
                    )}
                    {result.upcoming_count > 0 && (
                      <span className="ai-chip yellow">
                        <Clock size={11} />
                        {result.upcoming_count} на этой неделе
                      </span>
                    )}
                    {showCacheHint && (
                      <span className="ai-chip" style={{ background: '#E3FCEF', color: '#006644' }}>
                        <Zap size={11} />
                        из кеша
                      </span>
                    )}
                  </div>

                  <div className="ai-dist">
                    {Object.entries(result.distribution).map(([k, v]) =>
                      v > 0 ? (
                        <span key={k} className="ai-dist-item">
                          {k === 'high' ? 'Высокий' : k === 'medium' ? 'Средний' : 'Низкий'}: {v}
                        </span>
                      ) : null
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Refresh button */}
          {!isStreaming && (result || error) && (
            <button
              onClick={startStream}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 8, fontSize: 12, color: '#0052CC',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <RefreshCw size={11} />
              Обновить
            </button>
          )}

        </div>
      )}
    </div>
  )
}
