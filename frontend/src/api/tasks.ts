import api from './client'
import type {
  Task,
  TaskCreate,
  TaskUpdate,
  TaskListResponse,
  TaskFilters,
  CategorySuggestion,
  DecompositionResult,
  PrioritySuggestion,
  WorkloadSummary,
} from '../types/task'

export const tasksApi = {
  list: async (filters: TaskFilters = {}): Promise<TaskListResponse> => {
    const params: Record<string, string> = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.search) params.search = filters.search
    if (filters.deadline_before) params.deadline_before = filters.deadline_before
    const { data } = await api.get<TaskListResponse>('/tasks', { params })
    return data
  },

  get: async (id: string): Promise<Task> => {
    const { data } = await api.get<Task>(`/tasks/${id}`)
    return data
  },

  create: async (task: TaskCreate): Promise<Task> => {
    const { data } = await api.post<Task>('/tasks', task)
    return data
  },

  update: async (id: string, task: TaskUpdate): Promise<Task> => {
    const { data } = await api.patch<Task>(`/tasks/${id}`, task)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`)
  },
}

export const llmApi = {
  categorize: async (taskId: string): Promise<CategorySuggestion> => {
    const { data } = await api.post<CategorySuggestion>(`/llm/tasks/${taskId}/categorize`)
    return data
  },

  decompose: async (taskId: string): Promise<DecompositionResult> => {
    const { data } = await api.post<DecompositionResult>(`/llm/tasks/${taskId}/decompose`)
    return data
  },

  suggestPriority: async (taskId: string): Promise<PrioritySuggestion> => {
    const { data } = await api.post<PrioritySuggestion>(`/llm/tasks/${taskId}/suggest-priority`)
    return data
  },

  workloadSummary: async (): Promise<WorkloadSummary> => {
    const { data } = await api.get<WorkloadSummary>('/llm/workload-summary')
    return data
  },
}
