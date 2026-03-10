import type { Note, Section } from '../domain/types'

export const NotesView = ({
  notes,
  sections,
  onEdit,
  onCreate,
}: {
  notes: Note[]
  sections: Section[]
  onEdit: (note: Note) => void
  onCreate: () => void
}) => {
  return (
    <div className="notes-view">
      <div className="view-header">
        <div>
          <h2>Daily Notes</h2>
          <p>Track what you learn each day and tag it for future search.</p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          Add Note
        </button>
      </div>
      <div className="notes-grid">
        {notes.map((note) => (
          <button key={note.id} className="note-card" onClick={() => onEdit(note)}>
            <div className="note-card__date">{note.date}</div>
            <div className="note-card__content">{note.content}</div>
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
          </button>
        ))}
      </div>
    </div>
  )
}
