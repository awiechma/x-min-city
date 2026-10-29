OVERPASS_URL = "https://overpass-api.de/api/interpreter"

import os

# City profiles: each city brings its own data files and bounding box.
# Select the active city via the environment variable XMIN_CITY
# (default: "gelsenkirchen"). The data for Gelsenkirchen is prepared with
# scripts/prepare_gelsenkirchen.py.
CITY_PROFILES = {
    "remscheid": {
        "name": "Remscheid",
        "heightmodel": "data/hoehenmodell.tif",
        "osm_pbf": "data/duesseldorf-regbez-250910.osm.pbf",
        # [south, west, north, east] in WGS84
        "bbox": [51.0679, 6.9357, 51.3221, 7.4343],
        "grid_csv": "./data/census_100m_with_district.csv",
        "districts_shp": "data/districts.shp",
    },
    "gelsenkirchen": {
        "name": "Gelsenkirchen",
        # Optional: Gelsenkirchen is largely flat, routing works without elevation model
        "heightmodel": "data/gelsenkirchen/hoehenmodell.tif",
        "osm_pbf": "data/gelsenkirchen/muenster-regbez-latest.osm.pbf",
        "bbox": [51.4550, 6.9500, 51.6450, 7.1900],
        "grid_csv": "./data/gelsenkirchen/census_100m_with_district.csv",
        "districts_shp": "data/gelsenkirchen/districts.shp",
    },
}

CITY = os.getenv("XMIN_CITY", "gelsenkirchen").lower()
if CITY not in CITY_PROFILES:
    raise RuntimeError(f"Unknown XMIN_CITY {CITY!r}, expected one of {list(CITY_PROFILES)}")

_profile = CITY_PROFILES[CITY]
CITY_NAME = _profile["name"]

# Elevation model is only used if the file exists
heightmodel = _profile["heightmodel"] if os.path.exists(_profile["heightmodel"]) else None
OSM_PBF = _profile["osm_pbf"]

CITY_BBOX = _profile["bbox"]
CSV_PATH_GRID = _profile["grid_csv"]

DISTRICTS_SHP = _profile["districts_shp"]
DISTRICT_ID_COL = "id"

WALK_SPEED = 4.7
CYCLE_SPEED = 15

CELL_SIZE = 100.0
HALF = CELL_SIZE / 2.0

# Category definitions used for POI retrieval via Overpass.
# Keys must match the frontend category identifiers (lowercase).
# Values define OSM tag filters used to build Overpass queries.
CATS = {
    "education": {"amenity": ["school", "kindergarten", "college", "university"]},
    "restaurant": {
        "amenity": [
            "bar",
            "biergarten",
            "cafe",
            "fast_food",
            "food_court",
            "pub",
            "restaurant",
        ]
    },
    "supermarket": {"shop": ["supermarket", "convenience", "food", "mall"]},
    "healthcare": {"amenity": ["clinic", "dentist", "doctors", "hospital", "pharmacy"]},
    "park": {"leisure": ["dog_park", "garden", "nature_reserve", "park", "playground", "cemetery" ]},
    "public_transport": {
        "amenity": ["bus_station", "taxi"],
        "public_transport": ["station", "stop_position", "platform"],
        "railway": ["station", "halt", "tram_stop"],
    },
}
