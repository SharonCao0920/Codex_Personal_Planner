import { useMemo, useState } from 'react'
import type { Note, Section } from '../domain/types'

export const NotesWorkspace = ({
  notes,
  sections,
  selectedDate,
  onDateChange,
  onEdit,
  onDelete,
  onCreate,
  onAsk,
  semanticStatus,
  semanticEnabled,
  onToggleSemantic,
  answer,
  semanticError,
}: {
  notes: Note[]
  sections: Section[]
  selectedDate: string
  onDateChange: (date: string) => void
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
  onCreate: () => void
  onAsk: (question: string) => void
  semanticStatus: 'idle' | 'loading' | 'ready' | 'error'
  semanticEnabled: boolean
  onToggleSemantic: (value: boolean) => void
  answer: string
  semanticError: string
}) => {
  const [question, setQuestion] = useState('')

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => note.date === selectedDate)
  }, [notes, selectedDate])

  const handleAsk = () => {
    if (!question.trim()) return
    onAsk(question.trim())
  }

  return (
    <div className="notes-workspace">
      <div className="notes-chat">
        <div className="chat-card">
          <div className="chat-header">
            <div>
              <h3>Ask your notes</h3>
              <p className="muted">One question at a time. We’ll answer using your notes.</p>
            </div>
            <div className="semantic-toggle">
              <div>
                <strong>Semantic</strong>
                <p className="muted">{semanticStatus}</p>
                {semanticError && <p className="muted">{semanticError}</p>}
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={semanticEnabled}
                  onChange={(event) => onToggleSemantic(event.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
          <div className="chat-input">
            <textarea
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask something like: What did I learn about client onboarding?"
            />
            <button className="primary-button" onClick={handleAsk}>
              Ask
            </button>
          </div>
          <div className="chat-answer">
            {answer ? <p>{answer}</p> : <p className="muted">Your answer will appear here.</p>}
          </div>
        </div>
      </div>

      <div className="notes-right">
        <div className="notes-header">
          <div>
            <h3>Notes</h3>
            <p className="muted">Pick a date, then add or edit.</p>
          </div>
          <div className="notes-controls">
            <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
            <button className="primary-button" onClick={onCreate}>
              Add Note
            </button>
          </div>
        </div>
        <div className="notes-list">
          {filteredNotes.map((note) => (
            <div key={note.id} className="note-item">
              <div className="note-card">
                <div className="note-card__content">{truncate(note.content, 120)}</div>
                <div className="note-card__tags">
                  {note.tags.length > 0 ? (
                    note.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="chip muted">No tags</span>
                  )}
                </div>
                {note.sectionId && (
                  <div className="note-card__section">
                    {sections.find((section) => section.id === note.sectionId)?.name ?? 'Custom'}
                  </div>
                )}
              </div>
              <div className="note-actions">
                <button className="ghost-button" onClick={() => onEdit(note)}>
                  Edit
                </button>
                <button className="danger-button" onClick={() => onDelete(note.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && <p className="muted">No notes for this date.</p>}
        </div>
      </div>
    </div>
  )
}

const truncate = (value: string, length: number) => {
  if (value.length <= length) return value
  return `${value.slice(0, length).trim()}...`
}
