OVERPASS_URL = "https://overpass-api.de/api/interpreter"

heightmodel = "data/hoehenmodell.tif"
OSM_PBF = "data/duesseldorf-regbez-250910.osm.pbf"

CITY_BBOX = [51.0679, 6.9357, 51.3221, 7.4343]
CSV_PATH_GRID = "./data/census_100m_with_district.csv"

DISTRICTS_SHP = "data/districts.shp"
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
