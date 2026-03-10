import type { DailyPlan, Note, Section, Task } from '../domain/types'
import { getDb } from './db'
import { defaultSections } from './defaults'

export const initDefaults = async (): Promise<void> => {
  const db = await getDb()
  const count = await db.count('sections')
  if (count > 0) return
  const sections = defaultSections()
  const tx = db.transaction('sections', 'readwrite')
  for (const section of sections) {
    await tx.store.put(section)
  }
  await tx.done
}

export const listSections = async (): Promise<Section[]> => {
  const db = await getDb()
  const sections = await db.getAll('sections')
  return sections.sort((a, b) => a.order - b.order)
}

export const upsertSection = async (section: Section): Promise<void> => {
  const db = await getDb()
  await db.put('sections', section)
}

export const deleteSection = async (sectionId: string): Promise<void> => {
  const db = await getDb()
  await db.delete('sections', sectionId)
}

export const listTasks = async (): Promise<Task[]> => {
  const db = await getDb()
  return db.getAll('tasks')
}

export const upsertTask = async (task: Task): Promise<void> => {
  const db = await getDb()
  await db.put('tasks', task)
}

export const deleteTask = async (taskId: string): Promise<void> => {
  const db = await getDb()
  await db.delete('tasks', taskId)
}

export const listNotes = async (): Promise<Note[]> => {
  const db = await getDb()
  return db.getAll('notes')
}

export const upsertNote = async (note: Note): Promise<void> => {
  const db = await getDb()
  await db.put('notes', note)
}

export const deleteNote = async (noteId: string): Promise<void> => {
  const db = await getDb()
  await db.delete('notes', noteId)
}

export const listNoteEmbeddings = async (): Promise<{ id: string; vector: number[] }[]> => {
  const db = await getDb()
  return db.getAll('noteEmbeddings')
}

export const upsertNoteEmbedding = async (id: string, vector: number[]): Promise<void> => {
  const db = await getDb()
  await db.put('noteEmbeddings', { id, vector })
}

export const deleteNoteEmbedding = async (id: string): Promise<void> => {
  const db = await getDb()
  await db.delete('noteEmbeddings', id)
}

export const listDailyPlans = async (): Promise<DailyPlan[]> => {
  const db = await getDb()
  return db.getAll('dailyPlans')
}

export const getDailyPlanByDate = async (date: string): Promise<DailyPlan | undefined> => {
  const db = await getDb()
  return db.get('dailyPlans', `plan-${date}`)
}

export const upsertDailyPlan = async (plan: DailyPlan): Promise<void> => {
  const db = await getDb()
  await db.put('dailyPlans', plan)
}

export const getMeta = async (key: string): Promise<string | undefined> => {
  const db = await getDb()
  const record = await db.get('meta', key)
  return record?.value
}

export const setMeta = async (key: string, value: string): Promise<void> => {
  const db = await getDb()
  await db.put('meta', { key, value })
}
