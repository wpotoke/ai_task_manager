export type Priority = 'low' | 'medium' | 'high'
export type Status = 'waiting' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string | null
  priority: Priority
  status: Status
  deadline: string | null
  category: string | null
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  title: string
  description?: string | null
  priority: Priority
  status: Status
  deadline?: string | null
  category?: string | null
}

export interface TaskUpdate {
  title?: string
  description?: string | null
  priority?: Priority
  status?: Status
  deadline?: string | null
  category?: string | null
}

export interface TaskListResponse {
  items: Task[]
  total: number
}

export interface TaskFilters {
  status?: Status | ''
  priority?: Priority | ''
  search?: string
  deadline_before?: string
}

export interface CategorySuggestion {
  category: string
  reasoning: string
}

export interface SubTask {
  title: string
  description?: string | null
}

export interface DecompositionResult {
  subtasks: SubTask[]
  reasoning: string
}

export interface PrioritySuggestion {
  priority: Priority
  reasoning: string
}

export interface WorkloadSummary {
  summary: string
  overdue_count: number
  upcoming_count: number
  distribution: Record<string, number>
  from_cache?: boolean
}
