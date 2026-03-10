import { useEffect, useMemo, useState } from 'react'
import './App.css'
import type { DailyPlan, Note, Section, Task, TaskCheckin } from './domain/types'
import { addDays, formatDateISO, parseDateISO, todayISO } from './domain/date'
import { generateDailyPlan } from './domain/planner'
import {
  deleteNote,
  deleteNoteEmbedding,
  deleteSection,
  deleteTask,
  getDailyPlanByDate,
  getMeta,
  initDefaults,
  listDailyPlans,
  listNoteEmbeddings,
  listNotes,
  listSections,
  listTasks,
  setMeta,
  upsertDailyPlan,
  upsertNote,
  upsertNoteEmbedding,
  upsertSection,
  upsertTask,
} from './storage/repository'
import { TaskCard } from './components/TaskCard'
import { TaskModal } from './components/TaskModal'
import { NoteModal } from './components/NoteModal'
import { DailyPlanView } from './components/DailyPlanView'
import { Modal } from './components/Modal'
import { cosineSimilarity, getEmbedder, preflightSemanticAssets } from './domain/semantic'
import { NotesWorkspace } from './components/NotesWorkspace'

const tabs = {
  home: 'home',
  plan: 'plan',
  notes: 'notes',
}

const statusLabels: Record<Task['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
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

export default function App() {
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | undefined>(undefined)
  const [planDates, setPlanDates] = useState<string[]>([])
  const [selectedPlanDate, setSelectedPlanDate] = useState<string>(todayISO())
  const [activeTab, setActiveTab] = useState<string>(tabs.home)
  const [search, setSearch] = useState('')
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined)
  const [creatingTaskForSection, setCreatingTaskForSection] = useState<string | undefined>(undefined)
  const [creatingNote, setCreatingNote] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [pendingCheckinPlan, setPendingCheckinPlan] = useState<DailyPlan | undefined>(undefined)
  const [pendingCheckins, setPendingCheckins] = useState<Record<string, TaskCheckin>>({})
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const [noteEmbeddings, setNoteEmbeddings] = useState<Record<string, number[]>>({})
  const [semanticMatches, setSemanticMatches] = useState<Note[]>([])
  const [semanticStatus, setSemanticStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [semanticEnabled, setSemanticEnabled] = useState(true)
  const [semanticError, setSemanticError] = useState('')

  const [selectedNoteDate, setSelectedNoteDate] = useState(todayISO())
  const [noteAnswer, setNoteAnswer] = useState('')

  const refreshPlanDates = async () => {
    const plans = await listDailyPlans()
    const dates = plans.map((item) => item.date).sort((a, b) => b.localeCompare(a))
    setPlanDates(dates.length > 0 ? dates : [todayISO()])
  }

  useEffect(() => {
    const load = async () => {
      await initDefaults()
      const [loadedSections, loadedTasks, loadedNotes, embeddings, semanticPref] = await Promise.all([
        listSections(),
        listTasks(),
        listNotes(),
        listNoteEmbeddings(),
        getMeta('semanticEnabled'),
      ])
      setSections(loadedSections)
      setTasks(loadedTasks)
      setNotes(loadedNotes)
      setSelectedNoteDate(todayISO())
      if (semanticPref) setSemanticEnabled(semanticPref === 'true')
      setNoteEmbeddings(
        embeddings.reduce<Record<string, number[]>>((acc, item) => {
          acc[item.id] = item.vector
          return acc
        }, {})
      )

      const today = todayISO()
      const yesterday = formatDateISO(addDays(parseDateISO(today), -1))
      const yesterdayPlan = await getDailyPlanByDate(yesterday)

      await refreshPlanDates()

      if (yesterdayPlan && yesterdayPlan.completionPercent === undefined) {
        const initialCheckins: Record<string, TaskCheckin> = {}
        for (const task of loadedTasks.filter((item) => yesterdayPlan.taskIds.includes(item.id))) {
          initialCheckins[task.id] = {
            status: task.status,
            progress: task.status === 'in_progress' ? task.progress ?? 0 : undefined,
          }
        }
        setPendingCheckins(initialCheckins)
        setPendingCheckinPlan(yesterdayPlan)
        setSelectedPlanDate(yesterday)
        setDailyPlan(yesterdayPlan)
        setActiveTab(tabs.plan)
        return
      }

      let plan = await getDailyPlanByDate(today)
      if (!plan) {
        const { plan: newPlan, updatedTasks } = generateDailyPlan({
          tasks: loadedTasks,
          sections: loadedSections,
          date: today,
        })
        if (updatedTasks.length > 0) {
          await Promise.all(updatedTasks.map((task) => upsertTask(task)))
          setTasks((prev) => {
            const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]))
            return prev.map((task) => updatedMap.get(task.id) ?? task)
          })
        }
        await upsertDailyPlan(newPlan)
        plan = newPlan
        await refreshPlanDates()
      }
      setDailyPlan(plan)
      setSelectedPlanDate(today)
    }

    load()
  }, [])

  useEffect(() => {
    setMeta('semanticEnabled', semanticEnabled ? 'true' : 'false')
  }, [semanticEnabled])

  useEffect(() => {
    const preflight = async () => {
      if (!semanticEnabled) return
      const result = await preflightSemanticAssets()
      if (!result.ok) {
        setSemanticError(result.message ?? 'Missing assets')
        setSemanticStatus('error')
      } else {
        setSemanticError('')
      }
    }
    preflight()
  }, [semanticEnabled])

  useEffect(() => {
    const ensureEmbeddings = async () => {
      if (!semanticEnabled) return
      if (notes.length === 0) return
      if (semanticError) return
      const missing = notes.filter((note) => !noteEmbeddings[note.id])
      if (missing.length === 0) {
        if (semanticStatus !== 'ready') setSemanticStatus('ready')
        return
      }
      try {
        setSemanticStatus('loading')
        const embed = await getEmbedder()
        const updates: Record<string, number[]> = {}
        for (const note of missing) {
          const vector = await embed(`${note.content} ${note.tags.join(' ')}`)
          await upsertNoteEmbedding(note.id, vector)
          updates[note.id] = vector
        }
        if (Object.keys(updates).length > 0) {
          setNoteEmbeddings((prev) => ({ ...prev, ...updates }))
        }
        setSemanticStatus('ready')
      } catch (error) {
        console.error(error)
        setSemanticStatus('error')
        setSemanticError(error instanceof Error ? error.message : 'Embedding failed')
      }
    }

    ensureEmbeddings()
  }, [notes, noteEmbeddings, semanticEnabled, semanticStatus, semanticError])

  const sectionTabs = sections.map((section) => ({ id: section.id, label: section.name }))
  const activeSection = sections.find((section) => section.id === activeTab)

  const normalizedSearch = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return { tasks: [], notes: [] }
    const taskMatches = tasks.filter((task) => {
      const haystack = `${task.title} ${task.description}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
    const noteMatches = notes.filter((note) => {
      const haystack = `${note.content} ${note.tags.join(' ')}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
    return { tasks: taskMatches, notes: noteMatches }
  }, [normalizedSearch, tasks, notes])

  useEffect(() => {
    if (!normalizedSearch || !semanticEnabled) {
      setSemanticMatches([])
      return
    }
    if (semanticError) return
    let cancelled = false
    const run = async () => {
      try {
        setSemanticStatus('loading')
        const embed = await getEmbedder()
        const queryVector = await embed(normalizedSearch)
        const scored = notes
          .map((note) => {
            const vector = noteEmbeddings[note.id]
            if (!vector) return { note, score: -1 }
            return { note, score: cosineSimilarity(queryVector, vector) }
          })
          .filter((item) => item.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map((item) => item.note)
        if (!cancelled) {
          setSemanticMatches(scored)
          setSemanticStatus('ready')
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setSemanticStatus('error')
          setSemanticError(error instanceof Error ? error.message : 'Semantic search failed')
        }
      }
    }
    const timer = setTimeout(run, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [normalizedSearch, notes, noteEmbeddings, semanticEnabled, semanticError])

  const handleSaveTask = async (task: Task) => {
    await upsertTask(task)
    setTasks((prev) => {
      const existing = prev.find((item) => item.id === task.id)
      if (existing) return prev.map((item) => (item.id === task.id ? task : item))
      return [...prev, task]
    })
    setEditingTask(undefined)
    setCreatingTaskForSection(undefined)
  }

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId)
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
    setEditingTask(undefined)
  }

  const handleSaveNote = async (note: Note) => {
    await upsertNote(note)
    setNotes((prev) => {
      const existing = prev.find((item) => item.id === note.id)
      if (existing) return prev.map((item) => (item.id === note.id ? note : item))
      return [...prev, note]
    })
    setEditingNote(undefined)
    setCreatingNote(false)
    setSelectedNoteDate(note.date)

    if (!semanticEnabled) return

    try {
      setSemanticError('')
      const embed = await getEmbedder()
      const vector = await embed(`${note.content} ${note.tags.join(' ')}`)
      await upsertNoteEmbedding(note.id, vector)
      setNoteEmbeddings((prev) => ({ ...prev, [note.id]: vector }))
    } catch (error) {
      console.error(error)
      setSemanticStatus('error')
      setSemanticError(error instanceof Error ? error.message : 'Embedding failed')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId)
    await deleteNoteEmbedding(noteId)
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
    setEditingNote(undefined)
    setNoteEmbeddings((prev) => {
      const next = { ...prev }
      delete next[noteId]
      return next
    })
  }

  const handleAddSection = async () => {
    const name = newSectionName.trim()
    if (!name) return
    const section: Section = {
      id: `section-${crypto.randomUUID()}`,
      name,
      order: sections.length,
      isDefault: false,
    }
    await upsertSection(section)
    setSections((prev) => [...prev, section])
    setNewSectionName('')
    setActiveTab(section.id)
  }

  const handleDeleteSection = async (sectionId: string) => {
    await deleteSection(sectionId)
    setSections((prev) => prev.filter((section) => section.id !== sectionId))
    if (activeTab === sectionId) setActiveTab(tabs.home)
  }

  const handleCheckin = async (checkins: Record<string, TaskCheckin>, completionPercent: number) => {
    if (!dailyPlan) return
    const updated = { ...dailyPlan, completionPercent, taskCheckins: checkins }
    await upsertDailyPlan(updated)
    setDailyPlan(updated)
    await refreshPlanDates()
  }

  const finalizePendingCheckin = async () => {
    if (!pendingCheckinPlan) return
    const updated = {
      ...pendingCheckinPlan,
      completionPercent: computeCompletion(pendingCheckins),
      taskCheckins: pendingCheckins,
    }
    await upsertDailyPlan(updated)
    setPendingCheckinPlan(undefined)
    setPendingCheckins({})
    await refreshPlanDates()

    const today = todayISO()
    let plan = await getDailyPlanByDate(today)
    if (!plan) {
      const { plan: newPlan, updatedTasks } = generateDailyPlan({
        tasks,
        sections,
        date: today,
      })
      if (updatedTasks.length > 0) {
        await Promise.all(updatedTasks.map((task) => upsertTask(task)))
        setTasks((prev) => {
          const updatedMap = new Map(updatedTasks.map((task) => [task.id, task]))
          return prev.map((task) => updatedMap.get(task.id) ?? task)
        })
      }
      await upsertDailyPlan(newPlan)
      plan = newPlan
      await refreshPlanDates()
    }
    setDailyPlan(plan)
    setSelectedPlanDate(today)
  }

  const updatePendingCheckin = (taskId: string, patch: Partial<TaskCheckin>) => {
    setPendingCheckins((prev) => {
      const base = prev[taskId] ?? { status: 'todo' as Task['status'] }
      return { ...prev, [taskId]: { ...base, ...patch } }
    })
  }

  const handleDropTask = async (status: Task['status'], sectionId?: string) => {
    if (!draggedTaskId) return
    const task = tasks.find((item) => item.id === draggedTaskId)
    if (!task) return
    const updated: Task = {
      ...task,
      status,
      sectionId: sectionId ?? task.sectionId,
      progress: status === 'in_progress' ? task.progress ?? 0 : undefined,
      updatedAt: new Date().toISOString(),
    }
    await upsertTask(updated)
    setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    setDraggedTaskId(null)
  }

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
  }

  const openNewTask = () => {
    const fallback = activeSection?.id ?? sections[0]?.id
    setCreatingTaskForSection(fallback)
    setEditingTask(undefined)
  }

  const openNewNote = () => {
    setCreatingNote(true)
    setEditingNote(undefined)
  }

  const handleSelectPlanDate = async (date: string) => {
    setSelectedPlanDate(date)
    const plan = await getDailyPlanByDate(date)
    setDailyPlan(plan)
  }

  const handleAskNotes = async (question: string) => {
    if (!semanticEnabled) {
      setNoteAnswer('Semantic search is disabled. Turn it on to ask notes.')
      return
    }
    if (notes.length === 0) {
      setNoteAnswer('No notes yet. Add notes to ask questions.')
      return
    }
    if (semanticError) {
      setNoteAnswer(`Semantic search unavailable: ${semanticError}`)
      return
    }
    try {
      setSemanticStatus('loading')
      const embed = await getEmbedder()
      const queryVector = await embed(question)
      const scored = notes
        .map((note) => {
          const vector = noteEmbeddings[note.id]
          if (!vector) return { note, score: -1 }
          return { note, score: cosineSimilarity(queryVector, vector) }
        })
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score)
      if (scored.length === 0) {
        setNoteAnswer('No relevant notes found yet.')
      } else {
        const best = scored[0]!.note
        setNoteAnswer(`From ${best.date}: ${best.content}`)
      }
      setSemanticStatus('ready')
    } catch (error) {
      console.error(error)
      setSemanticStatus('error')
      const message = error instanceof Error ? error.message : 'Semantic search failed'
      setSemanticError(message)
      setNoteAnswer(`Semantic search failed: ${message}`)
    }
  }

  const sectionColorMap = new Map(
    sections
      .sort((a, b) => a.order - b.order)
      .map((section, index) => [
        section.id,
        ['#e7f0ff', '#fff3e0', '#e6f7f1', '#f3e8ff', '#fff0f3'][index % 5],
      ])
  )

  const getSectionColor = (sectionId: string) => {
    return sectionColorMap.get(sectionId) ?? '#f5f8ff'
  }

  const isToday = selectedPlanDate === todayISO()
  const noteResults = semanticMatches.length > 0 ? semanticMatches : searchResults.notes

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="sidebar-home" onClick={() => setActiveTab(tabs.home)}>
            Planner
          </button>
          <p>Balance by design.</p>
        </div>
        <div className="sidebar-section">
          <button className={activeTab === tabs.plan ? 'active' : ''} onClick={() => setActiveTab(tabs.plan)}>
            Suggested Plan
          </button>
          <button className={activeTab === tabs.notes ? 'active' : ''} onClick={() => setActiveTab(tabs.notes)}>
            Notes
          </button>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-title">Sections</div>
          {sectionTabs.map((tab) => (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
          <div className="tab-inline">
            <input value={newSectionName} onChange={(event) => setNewSectionName(event.target.value)} placeholder="Add section" />
            <button className="ghost-button" onClick={handleAddSection}>
              Add
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="app-header">
          <div>
            <h2>Personal Planner</h2>
            <p>Your balanced day, your way.</p>
          </div>
          <div className="header-actions">
            <label className="search-field">
              <span className="sr-only">Search</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks and notes" />
            </label>
            <button className="primary-button" onClick={openNewTask}>
              New Task
            </button>
            <button className="ghost-button" onClick={openNewNote}>
              New Note
            </button>
          </div>
        </header>

        <main className="content">
          {normalizedSearch ? (
            <div className="search-results">
              <h2>Search Results</h2>
              <div className="search-columns">
                <div>
                  <h3>Tasks</h3>
                  {searchResults.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={() => setEditingTask(task)} draggable onDragStart={() => handleDragStart(task.id)} onDragEnd={handleDragEnd} style={{ background: getSectionColor(task.sectionId) }} />
                  ))}
                  {searchResults.tasks.length === 0 && <p className="muted">No tasks found.</p>}
                </div>
                <div>
                  <h3>Notes {semanticStatus === 'loading' && <span className="muted">(semantic loading)</span>}</h3>
                  {noteResults.map((note) => (
                    <button key={note.id} className="note-card" onClick={() => setEditingNote(note)}>
                      <div className="note-card__date">{note.date}</div>
                      <div className="note-card__content">{note.content}</div>
                      <div className="note-card__tags">
                        {note.tags.map((tag) => (
                          <span key={tag} className="chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                  {noteResults.length === 0 && <p className="muted">No notes found.</p>}
                  {semanticStatus === 'error' && (
                    <p className="muted">Semantic search unavailable, showing keyword matches.</p>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === tabs.home ? (
            <div className="board-view">
              <div className="view-header">
                <div>
                  <h2>Home</h2>
                  <p>All tasks grouped by status, newest first.</p>
                </div>
              </div>
              <div className="board">
                {(['todo', 'in_progress', 'done'] as Task['status'][]).map((status) => (
                  <div key={status} className="column" onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropTask(status)}>
                    <h3>{statusLabels[status]}</h3>
                    <div className="column-list">
                      {tasks
                        .filter((task) => task.status === status)
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setEditingTask(task)}
                            draggable
                            onDragStart={() => handleDragStart(task.id)}
                            onDragEnd={handleDragEnd}
                            className="home-task"
                            style={{ background: getSectionColor(task.sectionId) }}
                          />
                        ))}
                      {tasks.filter((task) => task.status === status).length === 0 && (
                        <p className="muted">No tasks yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === tabs.plan ? (
            <DailyPlanView
              plan={dailyPlan}
              tasks={tasks}              getSectionColor={getSectionColor}
              selectedDate={selectedPlanDate}
              availableDates={planDates}
              isToday={isToday}
              onSelectDate={handleSelectPlanDate}
              onEditTask={(task) => setEditingTask(task)}
              onCheckin={handleCheckin}
            />
          ) : activeTab === tabs.notes ? (
            <NotesWorkspace
              notes={[...notes].sort((a, b) => b.date.localeCompare(a.date))}              selectedDate={selectedNoteDate}
              onDateChange={setSelectedNoteDate}
              onEdit={(note) => setEditingNote(note)}
              onDelete={handleDeleteNote}
              onCreate={openNewNote}
              onAsk={handleAskNotes}
              semanticStatus={semanticStatus}
              semanticEnabled={semanticEnabled}
              onToggleSemantic={setSemanticEnabled}
              answer={noteAnswer}
              semanticError={semanticError}
            />
          ) : activeSection ? (
            <div className="board-view">
              <div className="view-header">
                <div>
                  <h2>{activeSection.name}</h2>
                  <p>Move tasks through To Do, In Progress, and Done.</p>
                </div>
                {!activeSection.isDefault && (
                  <button className="danger-button" onClick={() => handleDeleteSection(activeSection.id)}>
                    Delete Section
                  </button>
                )}
              </div>
              <div className="board">
                {(['todo', 'in_progress', 'done'] as Task['status'][]).map((status) => (
                  <div key={status} className="column" onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropTask(status, activeSection.id)}>
                    <h3>{statusLabels[status]}</h3>
                    <div className="column-list">
                      {tasks
                        .filter((task) => task.sectionId === activeSection.id && task.status === status)
                        .map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setEditingTask(task)}
                            draggable
                            onDragStart={() => handleDragStart(task.id)}
                            onDragEnd={handleDragEnd}
                            style={{ background: getSectionColor(task.sectionId) }}
                          />
                        ))}
                      {tasks.filter((task) => task.sectionId === activeSection.id && task.status === status).length === 0 && (
                        <p className="muted">No tasks yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="muted">Select a section to begin.</p>
          )}
        </main>
      </div>

      {editingTask && (
        <TaskModal          task={editingTask}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => setEditingTask(undefined)}
        />
      )}

      {!editingTask && creatingTaskForSection && (
        <TaskModal          initialSectionId={creatingTaskForSection}
          onSave={handleSaveTask}
          onClose={() => setCreatingTaskForSection(undefined)}
        />
      )}

      {editingNote && (
        <NoteModal          note={editingNote}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onClose={() => setEditingNote(undefined)}
        />
      )}

      {!editingNote && creatingNote && (
        <NoteModal          onSave={handleSaveNote}
          onClose={() => setCreatingNote(false)}
        />
      )}

      {pendingCheckinPlan && (
        <Modal title="Yesterday's Plan Check-in" onClose={() => {}}>
          <p>Before today's plan is created, review yesterday's progress.</p>
          <div className="checkin-list">
            {tasks
              .filter((task) => pendingCheckinPlan.taskIds.includes(task.id))
              .map((task) => {
                const entry = pendingCheckins[task.id] ?? { status: task.status, progress: task.progress ?? 0 }
                return (
                  <div key={task.id} className="checkin-row">
                    <div>
                      <div className="checkin-title">{task.title}</div>
                      <div className="checkin-controls">
                        <select
                          value={entry.status}
                          onChange={(event) => updatePendingCheckin(task.id, { status: event.target.value as Task['status'] })}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                        {entry.status === 'in_progress' && (
                          <div className="checkin-progress">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={entry.progress ?? 0}
                              onChange={(event) => updatePendingCheckin(task.id, { progress: Number(event.target.value) })}
                            />
                            <span>{entry.progress ?? 0}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="modal-actions">
            <div />
            <div className="modal-actions__right">
              <button className="primary-button" onClick={finalizePendingCheckin}>
                Save and Generate Today
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}







