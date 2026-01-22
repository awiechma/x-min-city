import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CityScopeMap from "./CityScopeComponents/CityScopeMap";
import Sidebar from "./Sidebar";
import CategorySidebar from "./CategorySidebar";
import LoadingOverlay from "./LoadingOverlay";
import Tooltip from "./Tooltip";
import { CATEGORIES, getLabel, isValidCategory } from "./tagConfig";

import "./css/CityScope.css";
import "./css/POI.css";

const DEFAULT_BBOX = "7.05,51.14,7.32,51.25"; // Remscheid (west,south,east,north)

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
  const [scenarioCategory, setScenarioCategory] = useState("supermarket");
  const [userPois, setUserPois] = useState([]);

  // Current "minutes" value that should be displayed in the UI
  const [currentMinutes, setCurrentMinutes] = useState(15);

  // Tooltip: show hint when scenario mode starts
  const [showScenarioTip, setShowScenarioTip] = useState(false);
  useEffect(() => {
    if (scenarioMode) setShowScenarioTip(true);
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

      const bbox = currentBboxRef.current ?? DEFAULT_BBOX;

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
            user_pois: userPois.map((p) => ({
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
    [analysisLevel, normalizedCategories, userPois],
  );

  /**
   * Computes per-district mean travel time for each selected category.
   *
   * The result is weighted by population:
   * mean_tt = sum(pop * tt) / sum(pop) (only for cells where tt exists)
   *
   * Note: This is NOT the same as "district average travel time over all residents"
   **/

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

  /**
   * Computes two grid-level statistics:
   * 1) coverage: share of population that can reach ALL selected categories within thresholdMinutes
   * 2) medianTime: population-weighted median of max(tt_<cat>) across categories per cell
   *
   */
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

  const handleMapClick = useCallback(
    (lat, lon) => {
      if (!scenarioMode) return;
      if (!isValidCategory(scenarioCategory)) return;

      setUserPois((prev) => [
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
    [scenarioMode, scenarioCategory],
  );

  const handleBboxChange = useCallback((bboxString) => {
    currentBboxRef.current = bboxString;
  }, []);

  return (
    <div className="cityscope-wrap">
      <Tooltip
        open={showScenarioTip}
        text="Wählen Sie eine Kategorie aus und klicken Sie dann auf die Karte, um einen POI zu setzen."
        onClose={() => setShowScenarioTip(false)}
      />

      <div className="sidebars">
        <Sidebar
          onStart={handleStart}
          origin={false}
          context="cityscope"
          analysisLevel={analysisLevel}
          onAnalysisLevelChange={setAnalysisLevel}
        />

        <CategorySidebar
          value={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>

      <div className="cityscope-map-wrap">
        {error && <div className="cityscope-error">{error}</div>}

        {/* Toggle button only shown when scenario panel is closed */}
        {!scenarioMode && (
          <div className="cityscope-scenario-toggle">
            <button
              type="button"
              className="cityscope-scenario-toggle-btn"
              onClick={() => setScenarioMode(true)}
            >
              Add new POIs
            </button>
          </div>
        )}

        {/* Scenario panel) */}
        {scenarioMode && (
          <div className="cityscope-scenario-panel leaflet-right">
            <div className="scenario-panel-header">
              <h5>Szenario-POIs</h5>
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
            {userPois.length > 0 && (
              <>
                <div className="scenario-poi-list">
                  {userPois.map((p) => (
                    <div key={p.id} className="scenario-poi-item">
                      <span>{getLabel(p.category)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setUserPois((prev) =>
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
                  onClick={() => setUserPois([])}
                >
                  Alle Szenario-POIs löschen
                </button>
              </>
            )}
          </div>
        )}

        {/* This tooltip is meant to guide the user to draw/select the analysis area.
            It is always rendered, but only open when rectanglePlaced is false. */}
        <Tooltip
          text="Wählen Sie einen Analysebereich aus"
          open={!rectanglePlaced && !showScenarioTip}
        />

        <CityScopeMap
          results={cityScopeLayer}
          thresholdMinutes={currentMinutes}
          selectedCategories={selectedCategories}
          userPois={userPois}
          rectanglePlaced={rectanglePlaced}
          onRectanglePlaced={setRectanglePlaced}
          analysisLevel={analysisLevel}
          districtStats={districtStats}
          onMapClick={handleMapClick}
          onBboxChange={handleBboxChange}
        />

        {gridStats && (
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
