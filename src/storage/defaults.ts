import type { Section } from '../domain/types'

export const defaultSections = (): Section[] => [
  { id: 'section-work', name: 'Work', order: 0, isDefault: true },
  { id: 'section-life', name: 'Life', order: 1, isDefault: true },
  { id: 'section-health', name: 'Health', order: 2, isDefault: true },
  { id: 'section-pet', name: 'Pet', order: 3, isDefault: true },
]
