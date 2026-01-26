import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CityScopeMap from "./CityScopeComponents/CityScopeMap";
import Sidebar from "./Sidebar";
import CategorySidebar from "./CategorySidebar";
import LoadingOverlay from "./LoadingOverlay";
import Tooltip from "./Tooltip";
import { CATEGORIES, getLabel, isValidCategory } from "./tagConfig";

import "./css/CityScope.css";
import "./css/POI.css";

export default function CityScope() {
  // UI / State
  const [selectedCategories, setSelectedCategories] = useState(CATEGORIES);
  const [analysisLevel, setAnalysisLevel] = useState("grid"); // "grid" | "district"
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // API results
  const [cityScopeLayer, setCityScopeLayer] = useState(null);

  // Derived results (only one is set depending on analysisLevel)
  const [gridStats, setGridStats] = useState(null);
  const [districtStats, setDistrictStats] = useState(null);

  // Map interaction
  const currentBboxRef = useRef(null);
  const [rectanglePlaced, setRectanglePlaced] = useState(false);

  // Scenario mode
  const [scenarioMode, setScenarioMode] = useState(false);
  const [scenarioAction, setScenarioAction] = useState("add");
  const [bbox, setBbox] = useState(null); // NEW
  const [scenarioCategory, setScenarioCategory] = useState("supermarket");
  const [addedUserPois, setAddedUserPois] = useState([]);

  // removal scenario state
  const [removedPoiIds, setRemovedPoiIds] = useState(() => new Set());
  const [allPois, setAllPois] = useState([]);
  const poiRemovalMode = scenarioMode && scenarioAction === "remove";

  // Current "minutes" value that should be displayed in the UI
  const [currentMinutes, setCurrentMinutes] = useState(15);

  // Tooltip: show hint when scenario mode starts
  const [showScenarioTip, setShowScenarioTip] = useState(false);
  useEffect(() => {
    if (!scenarioMode) return;
    setShowScenarioTip(true);
  }, [scenarioMode]);

  // Normalize categories once
  const normalizedCategories = useMemo(
    () => (selectedCategories || []).map((c) => c.toLowerCase()),
    [selectedCategories],
  );

  /**
   * Starts the computation by calling the backend.
   */
  const handleStart = useCallback(
    async (mode, minutes) => {
      if (!normalizedCategories.length) return;

      setCurrentMinutes(minutes);

      const bbox = currentBboxRef.current || null;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/cityscope", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            categories: normalizedCategories,
            bbox,
            currentMinutes: minutes,
            removed_poi_ids: Array.from(removedPoiIds).map(Number),
            user_pois: addedUserPois.map((p) => ({
              lat: p.lat,
              lon: p.lon,
              category: p.category,
              name: p.name || null,
            })),
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API /api/cityscope ${res.status}: ${text}`);
        }

        const featureCollection = await res.json();
        setCityScopeLayer(featureCollection);

        if (analysisLevel === "grid") {
          setGridStats(
            computeCityScopeStats(
              featureCollection,
              normalizedCategories,
              minutes,
            ),
          );
          setDistrictStats(null);
        } else {
          setDistrictStats(
            computeDistrictCategoryMeans(
              featureCollection,
              normalizedCategories,
            ),
          );
          setGridStats(null);
        }
      } catch (e) {
        console.error(e);
        setCityScopeLayer(null);
        setGridStats(null);
        setDistrictStats(null);
        setError(e?.message ?? "Unbekannter Fehler");
      } finally {
        setIsLoading(false);
      }
    },
    [analysisLevel, normalizedCategories, addedUserPois, removedPoiIds],
  );

  function computeDistrictCategoryMeans(featureCollection, catsLowercase) {
    if (!featureCollection || !Array.isArray(featureCollection.features))
      return null;
    if (!catsLowercase?.length) return null;

    const ttKeys = catsLowercase.map((c) => `tt_${c}`);
    const agg = {};

    for (const f of featureCollection.features) {
      const props = f.properties || {};
      const pop =
        typeof props.pop === "number" && props.pop > 0 ? props.pop : 0;
      const districtId = props.district_id;

      if (!pop || districtId == null) continue;

      if (!agg[districtId]) {
        agg[districtId] = {
          totalPop: 0,
          sum_t: {},
          sumPopWithTime: {},
        };
      }

      const a = agg[districtId];
      a.totalPop += pop;

      for (let i = 0; i < catsLowercase.length; i++) {
        const cat = catsLowercase[i];
        const key = ttKeys[i];
        const t = props[key];

        if (t == null || !Number.isFinite(t)) continue;

        if (a.sum_t[cat] == null) {
          a.sum_t[cat] = 0;
          a.sumPopWithTime[cat] = 0;
        }

        a.sum_t[cat] += pop * t;
        a.sumPopWithTime[cat] += pop;
      }
    }

    const result = {};
    for (const [districtId, a] of Object.entries(agg)) {
      const means = {};
      for (const cat of catsLowercase) {
        const s = a.sum_t[cat];
        const popWithTime = a.sumPopWithTime[cat];
        if (!s || !popWithTime) continue;
        means[cat] = s / popWithTime;
      }

      result[districtId] = {
        totalPop: a.totalPop,
        means,
      };
    }

    return result;
  }

  function computeCityScopeStats(
    featureCollection,
    catsLowercase,
    thresholdMinutes,
  ) {
    if (!featureCollection || !Array.isArray(featureCollection.features))
      return null;
    if (!catsLowercase?.length) return null;

    const ttKeys = catsLowercase.map((c) => `tt_${c}`);

    let totalPop = 0;
    let coveredPop = 0;

    const timePop = [];

    for (const f of featureCollection.features) {
      const props = f.properties || {};
      const pop =
        typeof props.pop === "number" && props.pop > 0 ? props.pop : 0;
      if (!pop) continue;

      totalPop += pop;

      let allCovered = true;
      let maxTime = 0;

      for (const key of ttKeys) {
        const t = props[key];

        if (t == null || !Number.isFinite(t)) {
          allCovered = false;
          maxTime = 0;
          break;
        }

        if (t > thresholdMinutes) allCovered = false;
        if (t > maxTime) maxTime = t;
      }

      if (maxTime > 0) timePop.push({ time: maxTime, pop });
      if (allCovered) coveredPop += pop;
    }

    if (!totalPop || !timePop.length) return null;

    const coverage = coveredPop / totalPop;

    timePop.sort((a, b) => a.time - b.time);

    const halfPop = totalPop / 2;
    let cumPop = 0;
    let medianTime = timePop[timePop.length - 1].time;

    for (const { time, pop } of timePop) {
      cumPop += pop;
      if (cumPop >= halfPop) {
        medianTime = time;
        break;
      }
    }

    return { coverage, medianTime, totalPop, coveredPop };
  }

  /* POI removal (Wegfall-Szenario) */
  const toggleRemovedPoi = useCallback((poiId) => {
    setRemovedPoiIds((prev) => {
      const next = new Set(prev);
      if (next.has(poiId)) next.delete(poiId);
      else next.add(poiId);
      return next;
    });
  }, []);

  const clearRemovedPois = useCallback(() => setRemovedPoiIds(new Set()), []);

  useEffect(() => {
    if (!bbox) {
      console.log("RESET");
      setAllPois([]);
      return;
    }

    fetch("/api/pois", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bbox, // [south, west, north, east]
        categories: normalizedCategories,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`POIs ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAllPois(data.pois || []);
      })
      .catch((err) => {
        console.error(err);
        setAllPois([]);
      });
  }, [bbox, normalizedCategories]);

  const handleMapClick = useCallback(
    (lat, lon) => {
      if (!scenarioMode) return;
      if (scenarioAction !== "add") return;
      if (!isValidCategory(scenarioCategory)) return;

      setAddedUserPois((prev) => [
        ...prev,
        {
          id: `user_${prev.length}`,
          lat,
          lon,
          category: scenarioCategory,
          name: null,
        },
      ]);
    },
    [scenarioMode, scenarioAction, scenarioCategory],
  );

  const handleBboxChange = useCallback(
    (bboxString) => {
      currentBboxRef.current = bboxString;

      const arr = bboxString.split(",").map(Number);
      if (arr.length !== 4 || arr.some((v) => !Number.isFinite(v))) {
        setBbox(null);
        return;
      }

      // Map liefert: west,south,east,north
      const [west, south, east, north] = arr;

      // Backend erwartet: south,west,north,east
      const backendBbox = [south, west, north, east];

      setBbox(backendBbox);

      if (poiRemovalMode) clearRemovedPois();
    },
    [poiRemovalMode, clearRemovedPois],
  );

  return (
    <div className="cityscope-wrap">
      <Tooltip
        open={showScenarioTip}
        text={
          poiRemovalMode
            ? "Klicken Sie auf POIs, um sie für das Wegfall-Szenario zu entfernen."
            : "Wählen Sie eine Kategorie aus und klicken Sie dann auf die Karte, um einen POI zu setzen."
        }
        onClose={() => setShowScenarioTip(false)}
      />
      {!scenarioMode && (
        <div className="sidebars">
          <Sidebar
            onStart={handleStart}
            origin={false}
            context="cityscope"
            bbox={currentBboxRef.current}
            analysisLevel={analysisLevel}
            onAnalysisLevelChange={setAnalysisLevel}
          />

          <CategorySidebar
            value={selectedCategories}
            onChange={setSelectedCategories}
          />
        </div>
      )}
      <div className="cityscope-map-wrap">
        {error && <div className="cityscope-error">{error}</div>}

        {/* Toggle button only shown when scenario panel is closed */}
        {!scenarioMode && (
          <div className="cityscope-scenario-toggle">
            <button
              type="button"
              className="cityscope-scenario-toggle-btn"
              onClick={() => {
                setScenarioMode(true);
                setScenarioAction("add");
              }}
            >
              Szenario Modus starten
            </button>
          </div>
        )}

        {/* Scenario panel */}
        {scenarioMode && (
          <div className="cityscope-scenario-panel leaflet-right">
            <div className="scenario-panel-header">
              <h5>Szenario</h5>
              <button
                type="button"
                className="scenario-exit-btn"
                onClick={() => {
                  setScenarioMode(false);
                  setShowScenarioTip(false);
                }}
              >
                ✕
              </button>
            </div>

            {/* NEW: choose add vs remove */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={() => setScenarioAction("add")}
                className={`ui-btn ${scenarioAction === "add" ? "active" : ""}`}
              >
                POI hinzufügen
              </button>
              <button
                type="button"
                onClick={() => setScenarioAction("remove")}
                className={`ui-btn ${scenarioAction === "remove" ? "active" : ""}`}
                title={
                  !rectanglePlaced
                    ? "Bitte zuerst einen Analysebereich auswählen"
                    : ""
                }
              >
                POI entfernen
              </button>
            </div>

            {scenarioAction === "add" && (
              <>
                Kategorie:
                <br />
                <select
                  value={scenarioCategory}
                  onChange={(e) => setScenarioCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {getLabel(c)}
                    </option>
                  ))}
                </select>
                {addedUserPois.length > 0 && (
                  <>
                    <div className="scenario-poi-list">
                      {addedUserPois.map((p) => (
                        <div key={p.id} className="scenario-poi-item">
                          <span>{getLabel(p.category)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setAddedUserPois((prev) =>
                                prev.filter((q) => q.id !== p.id),
                              )
                            }
                            aria-label="POI löschen"
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="scenario-clear-btn"
                      onClick={() => setAddedUserPois([])}
                    >
                      Alle Szenario-POIs löschen
                    </button>
                  </>
                )}
              </>
            )}

            {scenarioAction === "remove" && (
              <>
                <div style={{ marginBottom: "0.5rem" }}>
                  Klicke POIs auf der Karte an, um sie zu entfernen.
                </div>

                <button
                  type="button"
                  className="scenario-clear-btn"
                  onClick={clearRemovedPois}
                  disabled={removedPoiIds.size === 0}
                >
                  Entfernte POIs zurücksetzen
                </button>
              </>
            )}
          </div>
        )}

        <Tooltip
          text="Wählen Sie einen Analysebereich aus"
          open={!rectanglePlaced && !scenarioMode}
        />

        <CityScopeMap
          results={cityScopeLayer}
          thresholdMinutes={currentMinutes}
          selectedCategories={selectedCategories}
          rectanglePlaced={rectanglePlaced}
          onRectanglePlaced={setRectanglePlaced}
          analysisLevel={analysisLevel}
          districtStats={districtStats}
          scenarioMode={scenarioMode}
          allPois={allPois}
          poiRemovalMode={poiRemovalMode}
          removedPoiIds={removedPoiIds}
          onToggleRemovePoi={toggleRemovedPoi}
          userPois={addedUserPois}
          onMapClick={handleMapClick}
          onBboxChange={handleBboxChange}
        />

        {gridStats && !scenarioMode && (
          <div className="cityscope-stats-container">
            <div className="cityscope-stat-box">
              <h5>Coverage Score</h5>
              <p>
                {(gridStats.coverage * 100).toFixed(1)} %
                <br />
                <small>
                  {gridStats.coveredPop.toLocaleString("de-DE")} von{" "}
                  {gridStats.totalPop.toLocaleString("de-DE")} Personen
                  erreichen die gewählten Kategorien in {currentMinutes} Minuten
                  oder weniger.
                </small>
              </p>
            </div>

            <div className="cityscope-stat-box">
              <h5>mediane Reisezeit</h5>
              <p>
                {gridStats.medianTime != null
                  ? gridStats.medianTime.toFixed(1)
                  : "–"}{" "}
                Minuten
              </p>
            </div>
          </div>
        )}

        {isLoading && <LoadingOverlay open text="CityScore wird berechnet…" />}
      </div>
    </div>
  );
}
