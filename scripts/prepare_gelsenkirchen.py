"""
Prepares the input data for the Gelsenkirchen city profile.

Run from the backend directory with the backend venv activated:

    cd backend
    python ../scripts/prepare_gelsenkirchen.py

Creates backend/data/gelsenkirchen/ with:
- muenster-regbez-latest.osm.pbf   (OSM network, Geofabrik, Regierungsbezirk Münster)
- districts.shp (+ .dbf/.shx/.prj) (Stadtteile from OSM via Overpass, columns id, name)
- census_100m_with_district.csv    (Zensus 2022, 100m grid, with district_id)

Steps that already have their output file are skipped (use --force to redo them).
"""
import argparse
import csv
import io
import os
import zipfile

import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import LineString
from shapely.ops import polygonize, unary_union

OUT_DIR = "data/gelsenkirchen"

PBF_URL = "https://download.geofabrik.de/europe/germany/nordrhein-westfalen/muenster-regbez-latest.osm.pbf"
ZENSUS_URL = "https://www.destatis.de/static/DE/zensus/gitterdaten/Zensus2022_Bevoelkerungszahl.zip"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

PBF_OUT = os.path.join(OUT_DIR, "muenster-regbez-latest.osm.pbf")
DISTRICTS_OUT = os.path.join(OUT_DIR, "districts.shp")
GRID_OUT = os.path.join(OUT_DIR, "census_100m_with_district.csv")

HEADERS = {"User-Agent": "xmin/0.1"}


def download(url: str, path: str):
    """Streams a download to disk (large files, e.g. the OSM PBF)."""
    print(f"Lade {url}")
    tmp = path + ".part"
    with requests.get(url, stream=True, timeout=120, headers=HEADERS) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        done = 0
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"\r  {done / 1e6:.0f} / {total / 1e6:.0f} MB", end="")
    print()
    os.replace(tmp, path)


def relations_to_gdf(elements: list[dict]) -> gpd.GeoDataFrame:
    """
    Builds polygons from Overpass relations returned with `out geom;`.
    Outer member ways are polygonized, inner ways are cut out.
    """
    rows = []
    for el in elements:
        if el.get("type") != "relation":
            continue
        outer, inner = [], []
        for m in el.get("members", []):
            if m.get("type") != "way" or not m.get("geometry"):
                continue
            line = LineString([(p["lon"], p["lat"]) for p in m["geometry"]])
            (inner if m.get("role") == "inner" else outer).append(line)

        polys = list(polygonize(unary_union(outer)))
        if not polys:
            continue
        geom = unary_union(polys)
        holes = list(polygonize(unary_union(inner))) if inner else []
        if holes:
            geom = geom.difference(unary_union(holes))

        rows.append({"name": el.get("tags", {}).get("name"), "geometry": geom})

    return gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")


def fetch_districts() -> gpd.GeoDataFrame:
    """
    Fetches the Stadtteile of Gelsenkirchen from OSM.
    Tries admin_level 10 (Stadtteile) first, falls back to 9 (Stadtbezirke).
    """
    for level in ("10", "9"):
        q = f"""[out:json][timeout:120];
area["boundary"="administrative"]["admin_level"="6"]["name"="Gelsenkirchen"]->.city;
rel(area.city)["boundary"="administrative"]["admin_level"="{level}"];
out geom;"""
        print(f"Overpass: Grenzen admin_level={level}")
        r = requests.post(OVERPASS_URL, data={"data": q}, timeout=180, headers=HEADERS)
        r.raise_for_status()
        gdf = relations_to_gdf(r.json().get("elements", []))
        if len(gdf) >= 3:
            print(f"  {len(gdf)} Gebiete gefunden")
            return gdf
    raise RuntimeError("Keine Stadtteilgrenzen für Gelsenkirchen in OSM gefunden")


def prepare_districts():
    gdf = fetch_districts()
    gdf = gdf.sort_values("name").reset_index(drop=True)
    gdf.insert(0, "id", range(1, len(gdf) + 1))
    # Same CRS as the Remscheid districts (ETRS89 / UTM 32N)
    gdf = gdf.to_crs(epsg=25832)
    gdf.to_file(DISTRICTS_OUT, encoding="utf-8")
    print(f"Geschrieben: {DISTRICTS_OUT}")
    print("  " + ", ".join(gdf["name"].astype(str)))


def read_zensus_100m(zip_bytes: bytes, bounds_3035) -> pd.DataFrame:
    """
    Reads the 100m grid CSV from the Zensus ZIP in chunks and keeps
    only cells whose midpoint lies inside the given EPSG:3035 bounds.
    """
    minx, miny, maxx, maxy = bounds_3035
    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    names = [n for n in zf.namelist() if "100m" in n and n.lower().endswith(".csv")]
    if not names:
        raise RuntimeError(f"Keine 100m-CSV im ZIP gefunden: {zf.namelist()}")
    print(f"Lese {names[0]}")

    with zf.open(names[0]) as f:
        head = f.read(4096).decode("latin-1")
    sep = csv.Sniffer().sniff(head.splitlines()[0], delimiters=";,").delimiter

    parts = []
    with zf.open(names[0]) as f:
        for chunk in pd.read_csv(f, sep=sep, chunksize=500_000, encoding="latin-1", dtype=str):
            chunk["x_mp_100m"] = pd.to_numeric(chunk["x_mp_100m"], errors="coerce")
            chunk["y_mp_100m"] = pd.to_numeric(chunk["y_mp_100m"], errors="coerce")
            sub = chunk[
                chunk["x_mp_100m"].between(minx, maxx) & chunk["y_mp_100m"].between(miny, maxy)
            ]
            if not sub.empty:
                parts.append(sub)

    df = pd.concat(parts, ignore_index=True)
    pop_col = next(c for c in df.columns if c not in ("GITTER_ID_100m", "x_mp_100m", "y_mp_100m"))
    df = df.rename(columns={pop_col: "Bevoelkerungszahl"})
    df["Bevoelkerungszahl"] = pd.to_numeric(df["Bevoelkerungszahl"], errors="coerce")
    df = df.dropna(subset=["Bevoelkerungszahl"])
    return df[["GITTER_ID_100m", "x_mp_100m", "y_mp_100m", "Bevoelkerungszahl"]]


def prepare_grid():
    districts = gpd.read_file(DISTRICTS_OUT).to_crs(epsg=3035)

    print(f"Lade {ZENSUS_URL}")
    r = requests.get(ZENSUS_URL, timeout=300, headers=HEADERS)
    r.raise_for_status()

    df = read_zensus_100m(r.content, districts.total_bounds)
    print(f"Zellen im Stadtgebiet-Rechteck: {len(df)}")

    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["x_mp_100m"], df["y_mp_100m"]),
        crs="EPSG:3035",
    )
    joined = gpd.sjoin(gdf, districts[["id", "geometry"]], how="left", predicate="within")
    joined = joined.rename(columns={"id": "district_id"})
    joined["district_id"] = joined["district_id"].astype("Int64")
    joined = joined.drop(columns=["index_right", "geometry"])

    joined.to_csv(GRID_OUT, sep=";", index=False, encoding="utf-8-sig")
    inside = joined["district_id"].notna()
    print(f"Geschrieben: {GRID_OUT}")
    print(f"  Einwohner in Stadtteilen: {int(joined.loc[inside, 'Bevoelkerungszahl'].sum()):,}".replace(",", "."))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="Vorhandene Dateien neu erzeugen")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    if args.force or not os.path.exists(DISTRICTS_OUT):
        prepare_districts()
    if args.force or not os.path.exists(GRID_OUT):
        prepare_grid()
    if args.force or not os.path.exists(PBF_OUT):
        download(PBF_URL, PBF_OUT)

    print("Fertig. Backend starten mit XMIN_CITY=gelsenkirchen (Standard).")


if __name__ == "__main__":
    main()
