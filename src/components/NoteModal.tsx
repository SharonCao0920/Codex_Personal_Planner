import { useState } from 'react'
import type { Note, Section } from '../domain/types'
import { todayISO } from '../domain/date'
import { Modal } from './Modal'

export const NoteModal = ({
  sections,
  note,
  onSave,
  onDelete,
  onClose,
}: {
  sections: Section[]
  note?: Note
  onSave: (note: Note) => void
  onDelete?: (noteId: string) => void
  onClose: () => void
}) => {
  const [content, setContent] = useState(note?.content ?? '')
  const [date, setDate] = useState(note?.date ?? todayISO())
  const [tags, setTags] = useState(note?.tags.join(', ') ?? '')
  const [sectionId, setSectionId] = useState(note?.sectionId ?? '')

  const canSave = content.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const now = new Date().toISOString()
    const normalizedTags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    onSave({
      id: note?.id ?? `note-${crypto.randomUUID()}`,
      content: content.trim(),
      date,
      tags: normalizedTags,
      sectionId: sectionId || undefined,
      createdAt: note?.createdAt ?? now,
    })
  }

  return (
    <Modal title={note ? 'Edit Note' : 'New Note'} onClose={onClose}>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <label className="field">
        <span>What did you learn today?</span>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} />
      </label>
      <label className="field">
        <span>Tags (comma separated)</span>
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="career, fitness, focus" />
      </label>
      <label className="field">
        <span>Section (optional)</span>
        <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
          <option value="">None</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        {note && onDelete && (
          <button className="danger-button" onClick={() => onDelete(note.id)}>
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
