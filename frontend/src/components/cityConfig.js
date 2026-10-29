// City profiles for the map views and texts.
// Select the active city via VITE_CITY (e.g. in frontend/.env), default: gelsenkirchen.
// Must match the backend setting XMIN_CITY.
const CITY_PROFILES = {
  remscheid: {
    name: "Remscheid",
    genitive: "Remscheids",
    // Overview map (CityScope)
    center: [51.18, 7.2],
    zoom: 12,
    // Start view of the reach map
    reachView: { center: [51.178, 7.192], zoom: 13 },
  },
  gelsenkirchen: {
    name: "Gelsenkirchen",
    genitive: "Gelsenkirchens",
    center: [51.545, 7.07],
    zoom: 12,
    // Schalke, Plangebiet Wilhelminenstraße
    reachView: { center: [51.53, 7.083], zoom: 14 },
  },
};

const CITY_KEY = (import.meta.env.VITE_CITY || "gelsenkirchen").toLowerCase();

export const CITY = CITY_PROFILES[CITY_KEY] ?? CITY_PROFILES.gelsenkirchen;
