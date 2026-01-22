import "./css/Tooltip.css";

export default function Tooltip({ open, text, onClose }) {
  if (!open) return null;
  return (
    <div className="map-tip" role="status" aria-live="polite">
      <span className="map-tip-text">{text}</span>
      {onClose && (
        <button
          className="map-tip-close"
          onClick={onClose}
          aria-label="Hinweis schließen"
        >
          ×
        </button>
      )}
    </div>
  );
}
