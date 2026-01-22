import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

CSV_PATH_GRID_IN = "data/census_100m.csv"
CSV_PATH_GRID_OUT = "data/census_100m_with_district.csv"
DISTRICTS_SHP = "data/districts.shp"

DISTRICT_ID_COL = "id" 

# 1. Zensus-CSV laden und Datentypen fixen
df = pd.read_csv(
    CSV_PATH_GRID_IN,
    sep=";",
    names=["GITTER_ID_100m", "x_mp_100m", "y_mp_100m", "Bevoelkerungszahl"],
    encoding="utf-8-sig",
)

df["x_mp_100m"] = pd.to_numeric(df["x_mp_100m"], errors="coerce")
df["y_mp_100m"] = pd.to_numeric(df["y_mp_100m"], errors="coerce")
df["Bevoelkerungszahl"] = pd.to_numeric(df["Bevoelkerungszahl"], errors="coerce")

# 2. GeoDataFrame aus Zensuspunkten
gdf_grid = gpd.GeoDataFrame(
    df,
    geometry=gpd.points_from_xy(df["x_mp_100m"], df["y_mp_100m"]),
    crs="EPSG:3035",
)

# 3a. Districts laden und auf EPSG:3035 projizieren
districts = gpd.read_file(DISTRICTS_SHP)

if districts.crs is None:
    raise RuntimeError("districts.shp hat kein CRS – bitte in QGIS setzen!")

districts = districts.to_crs(epsg=3035)

if DISTRICT_ID_COL not in districts.columns:
    raise RuntimeError(
        f"Spalte {DISTRICT_ID_COL!r} nicht im Shapefile gefunden. "
        f"Verfügbare Spalten: {list(districts.columns)}"
    )

# 3b. Grid auf Bounding Box der Districts beschränken (Performance)
minx, miny, maxx, maxy = districts.total_bounds
gdf_grid = gdf_grid.cx[minx:maxx, miny:maxy]

print(f"Zellen nach BBOX-Filter: {len(gdf_grid)}")

# 4. Spatial Join: Zellen-Mittelpunkt muss im District liegen
joined = gpd.sjoin(
    gdf_grid,
    districts[[DISTRICT_ID_COL, "geometry"]],
    how="left",
    predicate="within",
)

# District-ID-Spalte umbenennen und in String casten
joined = joined.rename(columns={DISTRICT_ID_COL: "district_id"})
joined["district_id"] = joined["district_id"].astype("Int64")

# 5. Spalten aufräumen: Geometrie + Join-Index raus
joined = joined.drop(columns=["index_right", "geometry"])

print("Spalten im Ergebnis:", joined.columns.tolist())
print("Beispiel District IDs:", joined["district_id"].dropna().unique()[:10])

# 6. Neues CSV speichern
joined.to_csv(
    CSV_PATH_GRID_OUT,
    sep=";",
    index=False,
    encoding="utf-8-sig",
)

print(f"Fertig. Datei gespeichert unter: {CSV_PATH_GRID_OUT}")