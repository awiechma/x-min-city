import Spinner from "./LoadingOverlayComponent/Spinner";
import "./css/LoadingOverlay.css";

export default function LoadingOverlay({
  open,
  text = "Isochrone werden geladen...",
}) {
  if (!open) return null;
  return (
    <div
      className="loading-overlay"
      role="alertdialog"
      aria-live="polite"
      aria-modal="true">
      <div className="loading-card">
        <Spinner size={36} />
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
}
