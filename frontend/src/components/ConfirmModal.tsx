import React from 'react'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A reusable confirmation modal component.
 * Displays a modal dialog when `open` is true, with provided title and message.
 * Calls `onConfirm` when the confirm button is clicked and `onCancel` for cancel.
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) => {
  if (!open) return null
  return (
    <div className="modal-overlay">
      <div className="modal">
        {title && <h3 className="modal-title">{title}</h3>}
        <p className="modal-message">{message}</p>
        <div className="modal-buttons">
          <button onClick={onCancel} className="btn btn-secondary btn-small">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn btn-danger btn-small">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal