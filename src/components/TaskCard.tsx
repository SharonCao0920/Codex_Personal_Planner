import type { Task } from '../domain/types'

const priorityLabel: Record<Task['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const TaskCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
  const showProgress = task.status === 'in_progress'
  const progressValue = task.progress ?? 0

  return (
    <button className={`task-card priority-${task.priority}`} onClick={onClick}>
      <div className="task-card__title">{task.title}</div>
      {task.description && <div className="task-card__desc">{task.description}</div>}
      {showProgress && (
        <div className="task-progress">
          <div className="task-progress__bar" style={{ width: `${progressValue}%` }} />
          <span>{progressValue}%</span>
        </div>
      )}
      <div className="task-card__meta">
        <span>{priorityLabel[task.priority]}</span>
        {task.dueDate && <span>Due {task.dueDate}</span>}
      </div>
    </button>
  )
}
