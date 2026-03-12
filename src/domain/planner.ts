import type { DailyPlan, Section, Task } from './types'
import { clamp, daysBetween, todayISO } from './date'
import { ensureNextDueDate } from './recurrence'

const priorityWeight: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const dueScore = (task: Task, today: string): number => {
  if (!task.dueDate) return 0
  const diff = daysBetween(today, task.dueDate)
  if (diff < 0) return 50
  if (diff === 0) return 40
  if (diff <= 5) return 20 + (5 - diff)
  return 0
}

const candidateWeight = (task: Task, today: string): number => {
  const priority = priorityWeight[task.priority] ?? 1
  return priority * 100 + dueScore(task, today)
}

const isCandidate = (task: Task, today: string): boolean => {
  if (task.status === 'in_progress') return true
  if (task.dueDate && daysBetween(today, task.dueDate) <= 5) return true
  if (task.recurrence && task.recurrence.nextDueDate <= today) return true
  return false
}

const selectBalanced = (tasks: Task[], sections: Section[], maxTasks: number): Task[] => {
  if (tasks.length <= maxTasks) return tasks
  const maxPerSection = Math.max(1, Math.ceil(maxTasks / Math.max(1, sections.length)))
  const counts = new Map<string, number>()
  const chosen: Task[] = []
  const remaining: Task[] = []

  for (const task of tasks) {
    const count = counts.get(task.sectionId) ?? 0
    if (count < maxPerSection && chosen.length < maxTasks) {
      chosen.push(task)
      counts.set(task.sectionId, count + 1)
    } else {
      remaining.push(task)
    }
  }

  for (const task of remaining) {
    if (chosen.length >= maxTasks) break
    chosen.push(task)
  }

  return chosen
}

export const generateDailyPlan = (params: {
  tasks: Task[]
  sections: Section[]
  date?: string
  maxTasks?: number
}): { plan: DailyPlan; updatedTasks: Task[] } => {
  const date = params.date ?? todayISO()
  const maxTasks = clamp(params.maxTasks ?? 8, 4, 15)
  const updatedTasks: Task[] = []

  const normalizedTasks = params.tasks.map((task) => {
    if (!task.recurrence) return task
    const updatedRecurrence = ensureNextDueDate(task.recurrence, date)
    if (updatedRecurrence.nextDueDate !== task.recurrence.nextDueDate) {
      const next: Task = {
        ...task,
        status: 'todo',
        progress: undefined,
        dueDate: updatedRecurrence.nextDueDate,
        recurrence: updatedRecurrence,
        updatedAt: new Date().toISOString(),
      }
      updatedTasks.push(next)
      return next
    }
    return task
  })

  const candidates = normalizedTasks
    .filter((task) => isCandidate(task, date))
    .sort((a, b) => candidateWeight(b, date) - candidateWeight(a, date))

  const selected = selectBalanced(candidates, params.sections, maxTasks)

  const plan: DailyPlan = {
    id: `plan-${date}`,
    date,
    taskIds: selected.map((task) => task.id),
    createdAt: new Date().toISOString(),
  }

  return { plan, updatedTasks }
}

