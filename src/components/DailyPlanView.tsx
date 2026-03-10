import { useEffect, useMemo, useState } from 'react'
import type { DailyPlan, Section, Task, TaskCheckin, TaskStatus } from '../domain/types'
import { TaskCard } from './TaskCard'

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const buildInitialCheckins = (tasks: Task[], plan?: DailyPlan): Record<string, TaskCheckin> => {
  const map: Record<string, TaskCheckin> = {}
  for (const task of tasks) {
    const existing = plan?.taskCheckins?.[task.id]
    if (existing) {
      map[task.id] = existing
    } else {
      map[task.id] = {
        status: task.status,
        progress: task.status === 'in_progress' ? task.progress ?? 0 : undefined,
      }
    }
  }
  return map
}

const computeCompletion = (checkins: Record<string, TaskCheckin>): number => {
  const entries = Object.values(checkins)
  if (entries.length === 0) return 0
  const total = entries.reduce((sum, entry) => {
    if (entry.status === 'done') return sum + 100
    if (entry.status === 'in_progress') return sum + (entry.progress ?? 0)
    return sum
  }, 0)
  return Math.round(total / entries.length)
}

export const DailyPlanView = ({
  plan,
  tasks,
  sections,
  getSectionColor,
  selectedDate,
  availableDates,
  isToday,
  onSelectDate,
  onEditTask,
  onCheckin,
}: {
  plan?: DailyPlan
  tasks: Task[]
  sections: Section[]
  getSectionColor: (sectionId: string) => string
  selectedDate: string
  availableDates: string[]
  isToday: boolean
  onSelectDate: (date: string) => void
  onEditTask: (task: Task) => void
  onCheckin: (checkins: Record<string, TaskCheckin>, completionPercent: number) => void
}) => {
  const planTasks = plan ? tasks.filter((task) => plan.taskIds.includes(task.id)) : []
  const sortedTasks = [...planTasks].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const locked = Boolean(plan)
  const [checkins, setCheckins] = useState<Record<string, TaskCheckin>>({})

  useEffect(() => {
    setCheckins({})
  }, [plan?.id, selectedDate])

  const effectiveCheckins = useMemo(() => {
    if (sortedTasks.length === 0) return {}
    if (Object.keys(checkins).length > 0) return checkins
    return buildInitialCheckins(sortedTasks, plan)
  }, [checkins, sortedTasks, plan])

  const updateCheckin = (taskId: string, patch: Partial<TaskCheckin>) => {
    setCheckins((prev) => {
      const base = prev[taskId] ?? { status: 'todo' as TaskStatus }
      return { ...prev, [taskId]: { ...base, ...patch } }
    })
  }

  return (
    <div className="daily-plan">
      <div className="view-header">
        <div>
          <h2>Suggested Daily Plan</h2>
          <p>Balanced mix from your priorities, due dates, and in-progress tasks.</p>
        </div>
        <div className="plan-controls">
          <label className="field">
            <span>Plan Date</span>
            <select value={selectedDate} onChange={(event) => onSelectDate(event.target.value)}>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </label>
          {locked && <span className="chip muted">Locked</span>}
        </div>
      </div>
      {plan ? (
        <div className="daily-plan-content">
          <div className="daily-plan-list">
            {sortedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onEditTask(task)} style={{ background: getSectionColor(task.sectionId) }} />
            ))}
            {sortedTasks.length === 0 && <p className="muted">No tasks match this plan.</p>}
          </div>
          <div className="daily-plan-summary">
            <h3>End of Day Check-in</h3>
            <p>Review each task before closing the day.</p>
            {sortedTasks.length === 0 ? (
              <p className="muted">No tasks to check in.</p>
            ) : isToday ? (
              <div className="checkin-list">
                {sortedTasks.map((task) => {
                  const entry = effectiveCheckins[task.id]
                  const progressValue = entry?.progress ?? 0
                  return (
                    <div key={task.id} className="checkin-row">
                      <div>
                        <div className="checkin-title">{task.title}</div>
                        <div className="checkin-controls">
                          <select
                            value={entry?.status ?? 'todo'}
                            onChange={(event) =>
                              updateCheckin(task.id, { status: event.target.value as TaskStatus })
                            }
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {entry?.status === 'in_progress' && (
                            <div className="checkin-progress">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={progressValue}
                                onChange={(event) =>
                                  updateCheckin(task.id, { progress: Number(event.target.value) })
                                }
                              />
                              <span>{progressValue}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="checkin-actions">
                  <button
                    className="primary-button"
                    onClick={() => onCheckin(effectiveCheckins, computeCompletion(effectiveCheckins))}
                  >
                    Save Check-in
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">Check-ins are only available on the plan day.</p>
            )}
            {plan.completionPercent !== undefined && (
              <div className="progress-pill">
                <strong>{plan.completionPercent}%</strong> completed
              </div>
            )}
            <div className="section-badges">
              {sections.map((section) => (
                <span key={section.id} className="chip muted">
                  {section.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="muted">No plan saved for this date.</p>
      )}
    </div>
  )
}





