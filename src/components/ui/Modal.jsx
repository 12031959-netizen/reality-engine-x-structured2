import { X } from "lucide-react";

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <article className="modal-card">
        <div className="modal-header">
          <h2>{title}</h2>

          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div>{children}</div>
      </article>
    </div>
  );
}