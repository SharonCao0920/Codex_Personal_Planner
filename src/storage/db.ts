import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { DailyPlan, Note, Section, Task } from '../domain/types'

interface PlannerDb extends DBSchema {
  sections: {
    key: string
    value: Section
  }
  tasks: {
    key: string
    value: Task
  }
  notes: {
    key: string
    value: Note
  }
  dailyPlans: {
    key: string
    value: DailyPlan
  }
  noteEmbeddings: {
    key: string
    value: { id: string; vector: number[] }
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

let dbPromise: Promise<IDBPDatabase<PlannerDb>> | null = null

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<PlannerDb>('personal-planner', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sections')) {
          db.createObjectStore('sections', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('dailyPlans')) {
          db.createObjectStore('dailyPlans', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('noteEmbeddings')) {
          db.createObjectStore('noteEmbeddings', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}
