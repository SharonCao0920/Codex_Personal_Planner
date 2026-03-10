import type { ReactNode } from 'react'
import './Modal.css'

export const Modal = ({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="ghost-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

