import { useState } from "react";

export default function Sidebar({
  onStart,
  origin,
  context,
  analysisLevel = "grid",
  onAnalysisLevelChange,
}) {
  const [mode, setMode] = useState("walk");
  const [minutes, setMinutes] = useState(15);

  const handleAnalysisChange = (level) => {
    if (!onAnalysisLevelChange) return;
    onAnalysisLevelChange(level);
  };

  return (
    <div className="sidebar">
      <h5>Einstellungen</h5>

      <div className="sidebar-group">
        <label>Transportmodus:</label>
        <div className="mode-group">
          <button
            type="button"
            className={`mode-btn ${mode === "walk" ? "active" : ""}`}
            onClick={() => setMode("walk")}
          >
            🚶 Zu Fuß
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === "bike" ? "active" : ""}`}
            onClick={() => setMode("bike")}
          >
            🚲 Fahrrad
          </button>
        </div>
      </div>

      {context === "cityscope" && (
        <div className="sidebar-group">
          <label>Analyse-Ebene:</label>
          <div className="mode-group">
            <button
              type="button"
              className={`mode-btn ${analysisLevel === "grid" ? "active" : ""}`}
              onClick={() => handleAnalysisChange("grid")}
            >
              🗺️ 100x100m
            </button>
            <button
              type="button"
              className={`mode-btn ${
                analysisLevel === "district" ? "active" : ""
              }`}
              onClick={() => handleAnalysisChange("district")}
            >
              🏙️️ Stadtteil
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-group">
        <label>
          Reisezeit: <strong>{minutes}</strong> min
        </label>
        <input
          className="time-slider"
          type="range"
          min="1"
          max="30"
          value={minutes}
          onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
        />
      </div>

      <button
        className="btn"
        disabled={!origin && context !== "cityscope"}
        onClick={() => onStart(mode, minutes)}
      >
        {context === "cityscope"
          ? "CityScore berechnen"
          : "Isochrone berechnen"}
      </button>
    </div>
  );
}
