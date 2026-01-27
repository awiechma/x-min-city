import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import "../css/CityScopeLeaflet.css";
import { getLabel } from "../tagConfig";

export default function CityScopeMap({
  results,
  thresholdMinutes,
  selectedCategories,
  onBboxChange,
  onMapClick,
  rectanglePlaced,
  userPois,
  scenarioMode,
  analysisLevel,
  districtStats,
  onRectanglePlaced,
  allPois,
  poiRemovalMode,
  removedPoiIds,
  onToggleRemovePoi,
}) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);

  const layerRef = useRef(null);
  const legendRef = useRef(null);
  const userPoisLayerRef = useRef(null);
  const allPoisLayerRef = useRef(null);

  const drawnGroupRef = useRef(null);
  const roiLayerRef = useRef(null);

  const [districtGeo, setDistrictGeo] = useState(null);

  const bboxStringFromBounds = (b) =>
    [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(",");

  const emitBboxFromBounds = (bounds) => {
    if (!onBboxChange || !bounds) return;
    onBboxChange(bboxStringFromBounds(bounds));
  };

  const getMaxTravelTimeForSelected = (props) => {
    if (!props || !selectedCategories || selectedCategories.length === 0) {
      return null;
    }
    let max = null;
    for (const cat of selectedCategories) {
      const key = `tt_${cat}`;
      const raw = props[key];
      if (raw == null) continue;
      const v = Number(raw);
      if (!Number.isFinite(v)) continue;
      if (max === null || v > max) max = v;
    }
    return max;
  };

  const colorForMinutes = (m) => {
    if (m == null) return "#eeeeee";
    if (m <= 5) return "#1a9641";
    if (m <= 10) return "#a6d96a";
    if (m <= 15) return "#ffffbf";
    if (m <= 20) return "#fdae61";
    return "#d7191c";
  };

  const getDistrictMetric = (districtId) => {
    if (!districtStats) return null;
    const d = districtStats[String(districtId)];
    if (!d || !d.means) return null;

    const cats = (selectedCategories || []).map((c) => String(c).toLowerCase());
    const values = cats
      .map((c) => d.means[c])
      .filter((v) => v != null && Number.isFinite(v));

    if (!values.length) return null;
    return Math.round(Math.max(...values));
  };

  const districtStyle = (feature) => {
    const props = feature?.properties || {};
    const id = props.district_id ?? props.id;
    const m = getDistrictMetric(id);

    const unreachable =
      m == null ||
      (typeof thresholdMinutes === "number" &&
        Number.isFinite(m) &&
        m > thresholdMinutes);

    if (unreachable) {
      return {
        color: "#555555",
        weight: 1,
        fillColor: "#000000",
        fillOpacity: 0.65,
      };
    }

    return {
      color: "#555555",
      weight: 1,
      fillColor: colorForMinutes(m),
      fillOpacity: 0.55,
    };
  };

  const buildDistrictTooltipHtml = (props) => {
    const rawId = props?.district_id ?? props?.id;
    const name = props?.name ?? "–";
    if (rawId == null) return "Keine Daten";

    const key = String(rawId);
    const stats = districtStats ? districtStats[key] : null;
    if (!stats || !stats.means)
      return `<b>Stadtteil ${name}</b><br/>Keine Daten`;

    const lines = [];
    lines.push(`<b>Stadtteil:</b> ${name}`);

    if (typeof stats.totalPop === "number") {
      lines.push(`<b>Einwohner:</b> ${stats.totalPop.toLocaleString("de-DE")}`);
    }

    (selectedCategories || []).forEach((cat) => {
      const cKey = cat.toLowerCase();
      const t = stats.means[cKey];
      const niceLabel = getLabel(cKey) ?? cat;
      if (t == null || !Number.isFinite(t))
        lines.push(`<b>${niceLabel}:</b> nicht erreichbar`);
      else lines.push(`<b>${niceLabel}:</b> ${Math.round(t)} min`);
    });

    return lines.join("<br/>");
  };

  useEffect(() => {
    fetch("/api/districts")
      .then((r) => r.json())
      .then(setDistrictGeo)
      .catch((err) =>
        console.error("Fehler beim Laden von districts.geojson:", err),
      );
  }, []);

  // Karte initialisieren + Rectangle ROI Tool
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    const map = L.map(mapElRef.current, {
      center: [51.18, 7.2],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap-Mitwirkende",
    }).addTo(map);

    mapRef.current = map;

    // ROI via Leaflet.Draw
    const drawnItems = new L.FeatureGroup();
    drawnItems.addTo(map);
    drawnGroupRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        rectangle: {
          showArea: false,
          shapeOptions: { color: "#36373bff", weight: 2, fillOpacity: 0.05 },
        },
        polygon: false,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        edit: false,
        remove: false,
      },
    });

    L.drawLocal.draw.toolbar.buttons.rectangle =
      "Erstelle einen Rechteck-Auswahlbereich";

    map.addControl(drawControl);

    const onCreated = (e) => {
      if (e.layerType !== "rectangle") return;

      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      roiLayerRef.current = e.layer;
      if (allPoisLayerRef.current) {
        allPoisLayerRef.current.remove();
        allPoisLayerRef.current = null;
      }

      onRectanglePlaced?.(true);
      emitBboxFromBounds(e.layer.getBounds());
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    // Legende
    legendRef.current = L.control({ position: "bottomright" });
    legendRef.current.onAdd = () => {
      const div = L.DomUtil.create("div", "cs-legend");
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      div.innerHTML = `
        <div class="cs-legend-title">Reisezeit (min)</div>
        <div class="cs-legend-row"><span class="cs-legend-swatch" style="background:${colorForMinutes(
          5,
        )}"></span> ≤ 5</div>
        <div class="cs-legend-row"><span class="cs-legend-swatch" style="background:${colorForMinutes(
          10,
        )}"></span> 5–10</div>
        <div class="cs-legend-row"><span class="cs-legend-swatch" style="background:${colorForMinutes(
          15,
        )}"></span> 10–15</div>
        <div class="cs-legend-row"><span class="cs-legend-swatch" style="background:${colorForMinutes(
          20,
        )}"></span> 15–20</div>
        <div class="cs-legend-row"><span class="cs-legend-swatch" style="background:${colorForMinutes(
          999,
        )}"></span> > 20</div>
        <div class="cs-legend-sep"></div>
        <div class="cs-legend-row"><span class="cs-legend-swatch" style="background:#000000"></span> außerhalb Schwelle</div>
      `;
      return div;
    };
    legendRef.current.addTo(map);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);

      if (allPoisLayerRef.current) {
        allPoisLayerRef.current.remove();
        allPoisLayerRef.current = null;
      }
      if (userPoisLayerRef.current) {
        userPoisLayerRef.current.remove();
        userPoisLayerRef.current = null;
      }
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }

      map.remove();
      mapRef.current = null;
      drawnGroupRef.current = null;
      roiLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const btn = document.querySelector(".leaflet-draw-draw-rectangle");
    if (!btn) return;

    if (!roiLayerRef.current) {
      btn.classList.add("pulse-rectangle");
    } else {
      btn.classList.remove("pulse-rectangle");
    }
  }, [
    // abhängig von rectanglePlaced und scenarioMode
    rectanglePlaced,
  ]);

  // Map Click (für Szenario-POIs etc.)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;

    const handler = (e) => onMapClick(e.latlng.lat, e.latlng.lng);

    if (!poiRemovalMode) {
      map.on("click", handler);
    }

    return () => {
      map.off("click", handler);
    };
  }, [onMapClick, poiRemovalMode]);

  // GeoJSON (Grid oder District) aktualisieren
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    // District-Modus: nur Stadtteil-Polygone
    if (analysisLevel === "district") {
      if (!districtGeo) return;

      const filtered = (() => {
        if (!districtStats) return null;

        const keys = new Set(Object.keys(districtStats));
        const feats = (districtGeo.features || []).filter((f) => {
          const props = f.properties || {};
          const id = props.district_id ?? props.id;
          if (id == null) return false;
          return keys.has(String(id));
        });

        return { ...districtGeo, features: feats };
      })();

      if (!filtered?.features?.length) return;

      const geoJsonLayer = L.geoJSON(filtered, {
        interactive: !scenarioMode,
        style: districtStyle,
        onEachFeature: (feature, layer) => {
          const html = buildDistrictTooltipHtml(feature.properties || {});
          layer.bindTooltip(html, { sticky: true, direction: "auto" });
        },
      });

      geoJsonLayer.addTo(map);
      layerRef.current = geoJsonLayer;
      return;
    }

    // Grid-Modus: 100x100m-Zellen
    if (!results?.features?.length) return;

    const geoJsonLayer = L.geoJSON(results, {
      interactive: !scenarioMode,
      style: (feature) => {
        const ttMax = getMaxTravelTimeForSelected(feature.properties);

        const unreachable =
          ttMax == null ||
          (typeof thresholdMinutes === "number" && ttMax > thresholdMinutes);

        const fillColor = unreachable ? "#000000" : colorForMinutes(ttMax);

        return {
          color: "#555555",
          weight: 0.5,
          fillColor,
          fillOpacity: 0.7,
        };
      },

      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const lines = [];

        lines.push(`<b>Zelle:</b> ${props.id ?? "-"}`);
        if (props.pop != null) lines.push(`<b>Einwohner:</b> ${props.pop}`);

        const selectedCatsLower = (selectedCategories || []).map((c) =>
          String(c).toLowerCase(),
        );

        selectedCatsLower.forEach((cat) => {
          const v = props[`tt_${cat}`];
          const niceLabel = getLabel(cat) ?? cat;

          if (v == null) lines.push(`<b>${niceLabel}:</b> nicht erreichbar`);
          else lines.push(`<b>${niceLabel}:</b> ${Math.round(v)} min`);
        });

        if (lines.length > 0) layer.bindPopup(lines.join("<br/>"));
      },
    });

    geoJsonLayer.addTo(map);
    layerRef.current = geoJsonLayer;
  }, [
    results,
    thresholdMinutes,
    selectedCategories,
    analysisLevel,
    districtGeo,
    districtStats,
    scenarioMode,
  ]);

  // imaginäre POIs anzeigen
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userPoisLayerRef.current) {
      userPoisLayerRef.current.remove();
      userPoisLayerRef.current = null;
    }

    if (!userPois || userPois.length === 0) return;

    const group = L.layerGroup(
      userPois.map((p) => {
        const className = `poi-dot ${"poi-" + p.category}`;
        return L.marker([p.lat, p.lon], {
          icon: L.divIcon({
            className,
            html: "",
            iconSize: [14, 14],
          }),
        }).bindPopup(p.name || p.category);
      }),
    );

    group.addTo(map);
    userPoisLayerRef.current = group;
  }, [userPois]);

  // Alle POIs anzeigen + im Wegfall-Modus per Klick "löschen"
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // alten Layer entfernen
    if (allPoisLayerRef.current) {
      allPoisLayerRef.current.remove();
      allPoisLayerRef.current = null;
    }
    console.log(allPois);
    // nur anzeigen, wenn Wegfall-Modus aktiv ist (oder wenn du einen extra "showAllPois" boolean willst)
    if (!poiRemovalMode) return;
    if (!allPois || allPois.length === 0) return;

    const removedSet =
      removedPoiIds instanceof Set
        ? removedPoiIds
        : new Set(removedPoiIds || []);

    const group = L.layerGroup(
      allPois
        // optional: entfernte POIs gar nicht mehr anzeigen
        .filter((p) => !removedSet.has(String(p.id)))
        .map((p) => {
          const id = String(p.id);

          const marker = L.marker([p.lat, p.lon], {
            icon: L.divIcon({
              className: `poi-dot poi-${String(p.category || "").toLowerCase()}`,
              html: "",
              iconSize: [12, 12],
            }),
            interactive: true,
          });

          marker.on("click", (e) => {
            L.DomEvent.stopPropagation(e);

            if (typeof onToggleRemovePoi === "function") {
              onToggleRemovePoi(id);
            }
          });

          marker.bindTooltip(p.name || p.category || "POI", {
            direction: "top",
            offset: [0, -6],
            opacity: 0.9,
          });

          return marker;
        }),
    );

    group.addTo(map);
    allPoisLayerRef.current = group;

    return () => {
      if (allPoisLayerRef.current) {
        allPoisLayerRef.current.remove();
        allPoisLayerRef.current = null;
      }
    };
  }, [poiRemovalMode, allPois, removedPoiIds, onToggleRemovePoi]);

  return (
    <div
      ref={mapElRef}
      className="cityscope-map"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
