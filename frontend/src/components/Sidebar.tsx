import { LayoutGrid, List, BrainCircuit, Zap, ChevronDown } from 'lucide-react'

type View = 'backlog' | 'board'

interface Props {
  view: View
  onViewChange: (v: View) => void
}

export function Sidebar({ view, onViewChange }: Props) {
  return (
    <aside className="jira-sidebar">
      {/* Project */}
      <div className="sidebar-project">
        <div className="sidebar-project-inner">
          <div className="sidebar-avatar">AI</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-project-name">AI Task Manager</div>
            <div className="sidebar-project-sub">Программный проект</div>
          </div>
          <ChevronDown size={12} style={{ color: 'rgba(255,255,255,.4)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1 }}>
        <div className="sidebar-section-label">Планирование</div>
        <div className="sidebar-nav">
          <button
            className={`sidebar-nav-item${view === 'backlog' ? ' active' : ''}`}
            onClick={() => onViewChange('backlog')}
          >
            <List size={15} />
            Бэклог
          </button>
          <button
            className={`sidebar-nav-item${view === 'board' ? ' active' : ''}`}
            onClick={() => onViewChange('board')}
          >
            <LayoutGrid size={15} />
            Доска
          </button>
        </div>

        <div className="sidebar-section-label" style={{ marginTop: 8 }}>ИИ-инструменты</div>
        <div className="sidebar-nav">
          <div className="sidebar-nav-item" style={{ opacity: 0.6, cursor: 'default' }}>
            <BrainCircuit size={15} />
            Сводка нагрузки
            <Zap size={11} style={{ color: '#FFD700', marginLeft: 'auto' }} />
          </div>
        </div>
      </div>

      <div className="sidebar-bottom">AI Task Manager v1.0</div>
    </aside>
  )
}
