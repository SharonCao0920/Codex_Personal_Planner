export type SectionId = string
export type TaskId = string
export type NoteId = string
export type DailyPlanId = string

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type RecurrenceFrequency = 'day' | 'week' | 'month'

export type Recurrence = {
  freq: RecurrenceFrequency
  interval: number
  byWeekdays?: number[]
  startDate: string
  nextDueDate: string
}

export type Section = {
  id: SectionId
  name: string
  order: number
  isDefault: boolean
}

export type Task = {
  id: TaskId
  title: string
  description: string
  status: TaskStatus
  sectionId: SectionId
  priority: Priority
  dueDate?: string
  progress?: number
  recurrence?: Recurrence
  createdAt: string
  updatedAt: string
}

export type Note = {
  id: NoteId
  content: string
  date: string
  tags: string[]
  sectionId?: SectionId
  createdAt: string
}

export type TaskCheckin = {
  status: TaskStatus
  progress?: number
}

export type DailyPlan = {
  id: DailyPlanId
  date: string
  taskIds: TaskId[]
  completionPercent?: number
  taskCheckins?: Record<TaskId, TaskCheckin>
  createdAt: string
}
