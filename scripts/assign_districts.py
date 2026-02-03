import pandas as pd
import geopandas as gpd

CSV_PATH_GRID_IN = "data/census_100m.csv"
CSV_PATH_GRID_OUT = "data/census_100m_with_district.csv"
DISTRICTS_SHP = "data/districts.shp"

DISTRICT_ID_COL = "id"


def main():
    """
    Enriches the 100m census grid with district identifiers via a spatial join.

    Steps:
    - Load the census CSV (EPSG:3035 midpoints) and coerce numeric types.
    - Load district polygons and reproject to EPSG:3035.
    - Clip census points to the districts' bounding box (performance prefilter).
    - Spatially join points to polygons (predicate="within") to assign `district_id`.
    - Write the enriched table back to CSV for fast loading in the API.

    Output columns:
    - GITTER_ID_100m, x_mp_100m, y_mp_100m, Bevoelkerungszahl, district_id
    """
    # 1) Load census CSV and normalize types
    df = pd.read_csv(
        CSV_PATH_GRID_IN,
        sep=";",
        names=["GITTER_ID_100m", "x_mp_100m", "y_mp_100m", "Bevoelkerungszahl"],
        encoding="utf-8-sig",
    )

    df["x_mp_100m"] = pd.to_numeric(df["x_mp_100m"], errors="coerce")
    df["y_mp_100m"] = pd.to_numeric(df["y_mp_100m"], errors="coerce")
    df["Bevoelkerungszahl"] = pd.to_numeric(df["Bevoelkerungszahl"], errors="coerce")

    # 2) Build point GeoDataFrame from cell midpoints (EPSG:3035)
    gdf_grid = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["x_mp_100m"], df["y_mp_100m"]),
        crs="EPSG:3035",
    )

    # 3) Load districts and ensure EPSG:3035 for spatial operations in meters
    districts = gpd.read_file(DISTRICTS_SHP)

    if districts.crs is None:
        raise RuntimeError("districts.shp has no CRS set; assign it before running this script.")

    districts = districts.to_crs(epsg=3035)

    if DISTRICT_ID_COL not in districts.columns:
        raise RuntimeError(
            f"Column {DISTRICT_ID_COL!r} not found in districts shapefile. "
            f"Available columns: {list(districts.columns)}"
        )

    # 4) Prefilter by districts' bounding box to reduce join cost
    minx, miny, maxx, maxy = districts.total_bounds
    gdf_grid = gdf_grid.cx[minx:maxx, miny:maxy]
    print(f"Cells after bbox prefilter: {len(gdf_grid)}")

    # 5) Spatial join: assign district id where the point lies within a district polygon
    joined = gpd.sjoin(
        gdf_grid,
        districts[[DISTRICT_ID_COL, "geometry"]],
        how="left",
        predicate="within",
    )

    joined = joined.rename(columns={DISTRICT_ID_COL: "district_id"})
    joined["district_id"] = joined["district_id"].astype("Int64")

    # 6) Drop GeoPandas join artifacts to keep the output as a pure table
    joined = joined.drop(columns=["index_right", "geometry"])

    print("Result columns:", joined.columns.tolist())
    print("Example district IDs:", joined["district_id"].dropna().unique()[:10])

    # 7) Write enriched CSV for API consumption
    joined.to_csv(
        CSV_PATH_GRID_OUT,
        sep=";",
        index=False,
        encoding="utf-8-sig",
    )

    print(f"Done. File written to: {CSV_PATH_GRID_OUT}")


if __name__ == "__main__":
    main()
