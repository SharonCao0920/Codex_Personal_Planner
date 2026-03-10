import { useMemo, useState } from 'react'
import type { Section, Task } from '../domain/types'
import { todayISO } from '../domain/date'
import { buildRecurrence } from '../domain/recurrence'
import { Modal } from './Modal'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const TaskModal = ({
  sections,
  task,
  initialSectionId,
  onSave,
  onDelete,
  onClose,
}: {
  sections: Section[]
  task?: Task
  initialSectionId?: string
  onSave: (task: Task) => void
  onDelete?: (taskId: string) => void
  onClose: () => void
}) => {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'todo')
  const [sectionId, setSectionId] = useState(task?.sectionId ?? initialSectionId ?? sections[0]?.id ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [progress, setProgress] = useState(task?.progress ?? 0)
  const [recurs, setRecurs] = useState(Boolean(task?.recurrence))
  const [freq, setFreq] = useState<'day' | 'week' | 'month'>(task?.recurrence?.freq ?? 'day')
  const [interval, setInterval] = useState(task?.recurrence?.interval ?? 1)
  const [byWeekdays, setByWeekdays] = useState<number[]>(task?.recurrence?.byWeekdays ?? [])
  const [startDate, setStartDate] = useState(task?.recurrence?.startDate ?? dueDate ?? todayISO())

  const canSave = title.trim().length > 0 && sectionId

  const toggleWeekday = (value: number) => {
    setByWeekdays((prev) => (prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]))
  }

  const recurrence = useMemo(() => {
    if (!recurs) return undefined
    return buildRecurrence({
      freq,
      interval,
      byWeekdays: freq === 'week' ? byWeekdays : undefined,
      startDate: startDate || todayISO(),
    })
  }, [recurs, freq, interval, byWeekdays, startDate])

  const handleSave = () => {
    if (!canSave) return
    const now = new Date().toISOString()
    const base: Task = {
      id: task?.id ?? `task-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim(),
      status,
      sectionId,
      priority,
      dueDate: dueDate || undefined,
      progress: status === 'in_progress' ? progress : undefined,
      recurrence,
      createdAt: task?.createdAt ?? now,
      updatedAt: now,
    }
    onSave(base)
  }

  return (
    <Modal title={task ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details"
          rows={3}
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as Task['status'])}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label className="field">
          <span>Section</span>
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="field">
          <span>Due Date</span>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
      </div>
      {status === 'in_progress' && (
        <div className="field">
          <span>Progress ({progress}%)</span>
          <input type="range" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} />
        </div>
      )}
      <div className="field inline">
        <input type="checkbox" checked={recurs} onChange={(event) => setRecurs(event.target.checked)} />
        <span>Recurring task</span>
      </div>
      {recurs && (
        <div className="recurrence-box">
          <div className="grid-3">
            <label className="field">
              <span>Frequency</span>
              <select value={freq} onChange={(event) => setFreq(event.target.value as 'day' | 'week' | 'month')}>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </label>
            <label className="field">
              <span>Every</span>
              <input
                type="number"
                min={1}
                value={interval}
                onChange={(event) => setInterval(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Start Date</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
          </div>
          {freq === 'week' && (
            <div className="weekday-row">
              {weekdays.map((label, index) => (
                <button
                  type="button"
                  key={label}
                  className={`chip ${byWeekdays.includes(index) ? 'active' : ''}`}
                  onClick={() => toggleWeekday(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="modal-actions">
        {task && onDelete && (
          <button className="danger-button" onClick={() => onDelete(task.id)}>
            Delete
          </button>
        )}
        <div className="modal-actions__right">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave} disabled={!canSave}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
