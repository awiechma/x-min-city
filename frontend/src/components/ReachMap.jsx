import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as turf from "@turf/turf";
import L from "leaflet";

import Sidebar from "./Sidebar";
import CategorySidebar from "./CategorySidebar";
import LoadingOverlay from "./LoadingOverlay";
import Tooltip from "./Tooltip";

import { CATEGORIES, getLabel, getDotClass } from "./tagConfig";

import "./css/ReachMap.css";
import "./css/POI.css";

const DEFAULT_VIEW = { center: [51.178, 7.192], zoom: 13 };

export default function ReachMap() {
  const mapRef = useRef(null);

  const mapInstanceRef = useRef(null);
  const poiLayerRef = useRef(null);
  const isoLayerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const [visiblePois, setVisiblePois] = useState([]);

  const isoPolygonRef = useRef(null);

  const [origin, setOrigin] = useState(null);
  const [loadingIso, setLoadingIso] = useState(false);
  const [categories, setCategories] = useState(CATEGORIES);

  /**
   * Builds per-category Leaflet div-icons once.
   * These icons are reused when rendering POI markers.
   */
  const icons = useMemo(() => {
    function circleIcon(cls) {
      return L.divIcon({
        className: "custom-icon",
        html: `<span class="poi-dot ${cls}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
    }

    return Object.fromEntries(
      CATEGORIES.map((k) => [k, circleIcon(getDotClass(k))]),
    );
  }, []);

  /**
   * Initializes the Leaflet map once:
   * - OSM base layer
   * - marker layer group for POIs
   * - click handler to set the origin marker
   */
  useEffect(() => {
    const map = L.map(mapRef.current, { zoomControl: false }).setView(
      DEFAULT_VIEW.center,
      DEFAULT_VIEW.zoom,
    );
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    poiLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      const nextOrigin = { lat: e.latlng.lat, lng: e.latlng.lng };
      setOrigin(nextOrigin);

      if (originMarkerRef.current) {
        map.removeLayer(originMarkerRef.current);
        originMarkerRef.current = null;
      }

      originMarkerRef.current = L.marker(e.latlng, {
        icon: L.icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(map);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      poiLayerRef.current = null;
      isoLayerRef.current = null;
      originMarkerRef.current = null;
      isoPolygonRef.current = null;
    };
  }, []);

  /**
   * Renders POIs as markers into the dedicated POI layer group.
   * Expects POIs to have { lat, lon, category, name }.
   */
  const displayPois = useCallback(
    (pois) => {
      const map = mapInstanceRef.current;
      const poiLayer = poiLayerRef.current;
      if (!map || !poiLayer) return;

      poiLayer.clearLayers();

      for (const p of pois) {
        const icon =
          icons[p.category] ??
          L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -15],
          });

        const label = `Kategorie: ${getLabel(p.category)} | Name: ${p.name ?? "POI"}`;

        L.marker([p.lat, p.lon], { icon }).bindTooltip(label).addTo(poiLayer);
      }
    },
    [icons],
  );

  /**
   * Displays the isochrone geometry on the map and fits the view to its bounds.
   * Accepts either a Feature or a Geometry object.
   */
  const displayGeoJSON = useCallback((geoJSON) => {
    const map = mapInstanceRef.current;
    if (!map || !geoJSON) return;

    const geometry = geoJSON.type === "Feature" ? geoJSON.geometry : geoJSON;

    isoPolygonRef.current = geometry;

    if (isoLayerRef.current) {
      map.removeLayer(isoLayerRef.current);
      isoLayerRef.current = null;
    }

    isoLayerRef.current = L.geoJSON(geometry, {
      style: {
        color: "#014b01ff",
        weight: 2,
        opacity: 0.9,
        fillColor: "#006400",
        fillOpacity: 0.2,
      },
    }).addTo(map);

    map.fitBounds(isoLayerRef.current.getBounds(), { padding: [20, 20] });
  }, []);

  /**
   * Requests an isochrone polygon from the backend for a given origin, mode, and threshold.
   * Returns GeoJSON (Feature/Geometry) or null on error.
   */
  const getIsochrones = useCallback(async (location, mode, time) => {
    try {
      const res = await fetch("/api/isochrone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: location.lat,
          lon: location.lng,
          mode,
          threshold: time,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API /api/isochrone ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  /**
   * Fetches POIs for a given isochrone by:
   * 1) requesting POIs within the isochrone bounding box (backend prefilter)
   * 2) filtering those POIs to points strictly inside the isochrone polygon (turf)
   */
  const fetchPois = useCallback(async (isoFeature, cats) => {
    if (!isoFeature) return [];

    const bounds = L.geoJSON(isoFeature).getBounds();
    const bbox = [
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    ];

    const res = await fetch("/api/pois", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bbox, categories: cats }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API /api/pois ${res.status}: ${text}`);
    }

    const { pois = [] } = await res.json();

    const validPois = pois.filter(
      (p) => Number.isFinite(+p.lon) && Number.isFinite(+p.lat),
    );

    const polygon =
      isoFeature.type === "Feature" ? isoFeature.geometry : isoFeature;

    return validPois.filter((p) =>
      turf.booleanPointInPolygon(turf.point([+p.lon, +p.lat]), polygon),
    );
  }, []);

  /**
   * Main entry point from the Sidebar:
   * - requests an isochrone
   * - renders it
   * - fetches POIs within that isochrone
   * - updates the visible POI set (category filtering is applied separately)
   */
  const handleStart = useCallback(
    async (mode, minutes) => {
      if (!origin) return;

      setLoadingIso(true);

      try {
        const iso = await getIsochrones(origin, mode, minutes);
        if (iso) displayGeoJSON(iso);

        // Fetch POIs after the isochrone is known
        const pois = await fetchPois(iso, CATEGORIES);
        setVisiblePois(pois || []);
      } catch (e) {
        console.error(e);

        if (poiLayerRef.current) poiLayerRef.current.clearLayers();
        if (isoLayerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(isoLayerRef.current);
          isoLayerRef.current = null;
        }
      } finally {
        setLoadingIso(false);
      }
    },
    [origin, categories, getIsochrones, fetchPois, displayGeoJSON, displayPois],
  );

  /**
   * Applies the active category filter to the fetched POIs and re-renders markers.
   */
  useEffect(() => {
    if (!poiLayerRef.current) return;

    const active = new Set(categories);
    const filtered = visiblePois.filter((p) => active.has(p.category));

    displayPois(filtered);
  }, [categories, visiblePois, displayPois]);

  return (
    <div className="map-wrap">
      <Tooltip
        open={!origin}
        text="Klick auf die Karte, um deinen Startpunkt zu setzen."
      />

      <div className="sidebars">
        <Sidebar onStart={handleStart} origin={origin} />
        <CategorySidebar value={categories} onChange={setCategories} />
      </div>

      <LoadingOverlay open={loadingIso} text="Isochrone werden geladen..." />

      <div ref={mapRef} className="map" />
    </div>
  );
}
