from fastapi import APIRouter, HTTPException, Request
from core.schemas import CityScopeRequest
from core.config import CATS, HALF, WALK_SPEED, CYCLE_SPEED

import datetime
import math
import pandas as pd
import geopandas as gpd
from shapely.geometry import box
from r5py import TransportMode, TravelTimeMatrix

from services.zensus import to_wgs84, to_laea, cell_polygon_wgs84

router = APIRouter(prefix="/api", tags=["cityscope"])


@router.post("/cityscope")
async def api_cityscope(req: CityScopeRequest, request: Request):
    """
    Computes per-cell travel times to the nearest POI per category inside a user-defined ROI.

    Workflow (high level):
    - Select census grid cells inside the ROI (bbox) in a metric CRS (EPSG:3035).
    - Collect candidate POIs for the selected categories (cache + optional user POIs),
      optionally removing POIs for the "removal scenario".
    - Apply a buffered ROI prefilter in EPSG:3035 to limit POIs before routing.
    - Build an R5 TravelTimeMatrix from cell centroids (origins) to POIs (destinations).
    - Aggregate to minimum travel time per (cell, category) and return as GeoJSON features.

    Returned feature properties include:
    - id, pop, district_id
    - tt_<category> (minutes) for each available category
    """
    st = request.app.state.app_state
    if st.network_status != "ready":
        raise HTTPException(status_code=500, detail="Transport network not yet ready")

    network = st.network
    df_grid = st.df_grid
    poi_cache = st.poi_cache

    # Categories: currently uses all configured categories (frontend can restrict on demand)
    cats = list(CATS)

    # Parse bbox string in WGS84 map order: minLon,minLat,maxLon,maxLat
    try:
        minLon, minLat, maxLon, maxLat = map(float, req.bbox.split(","))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid bbox format: {req.bbox!r}")

    # Convert bbox to EPSG:3035 (LAEA) to filter 100m grid cells in meters
    ll = to_laea.transform(minLon, minLat)
    lr = to_laea.transform(maxLon, minLat)
    ul = to_laea.transform(minLon, maxLat)
    ur = to_laea.transform(maxLon, maxLat)

    xs = [ll[0], lr[0], ul[0], ur[0]]
    ys = [ll[1], lr[1], ul[1], ur[1]]
    minX, maxX = min(xs), max(xs)
    minY, maxY = min(ys), max(ys)

    # Select grid cells intersecting the bbox (HALF expands to include full 100m cells)
    cells = df_grid[
        (df_grid["x_mp_100m"] >= minX - HALF)
        & (df_grid["x_mp_100m"] <= maxX + HALF)
        & (df_grid["y_mp_100m"] >= minY - HALF)
        & (df_grid["y_mp_100m"] <= maxY + HALF)
    ]

    if cells.empty:
        return {"type": "FeatureCollection", "features": []}

    # Collect POIs for all selected categories from the in-memory cache
    pois_dfs: list[pd.DataFrame] = []
    for cat in cats:
        df_cat = poi_cache.get(cat)
        if df_cat is None or df_cat.empty:
            continue

        sub = df_cat[["id", "lat", "lon", "category"]].copy()
        if not sub.empty:
            pois_dfs.append(sub)

    if not pois_dfs:
        return {"type": "FeatureCollection", "features": []}

    pois_df = pd.concat(pois_dfs, ignore_index=True)

    # Append optional user-defined POIs (scenario add)
    if req.user_pois:
        user_rows = []
        for i, p in enumerate(req.user_pois):
            user_rows.append(
                {
                    "id": f"user_{i}",
                    "lat": p.lat,
                    "lon": p.lon,
                    "category": p.category.lower(),
                    "name": p.name,
                }
            )
        df_user = pd.DataFrame(user_rows)
        pois_df = pd.concat([pois_df, df_user], ignore_index=True)

    # Remove POIs by id (scenario removal)
    removed = set(req.removed_poi_ids)
    if removed:
        pois_df = pois_df[~pois_df["id"].isin(removed)]

    if pois_df.empty:
        return {"type": "FeatureCollection", "features": []}

    # Prefilter POIs with a buffered ROI in meters (EPSG:3035) to reduce routing load
    minutes = int(req.currentMinutes)

    if req.mode.lower() == "walk":
        speed_kmh = 5
    else:
        speed_kmh = 16

    buffer_m = speed_kmh * (minutes / 60.0) * 1000.0

    roi_poly_wgs = box(minLon, minLat, maxLon, maxLat)
    roi_gdf = gpd.GeoDataFrame(geometry=[roi_poly_wgs], crs="EPSG:4326").to_crs("EPSG:3035")
    roi_buf_3035 = roi_gdf.geometry.iloc[0].buffer(buffer_m)

    pois_gdf_3035 = gpd.GeoDataFrame(
        pois_df,
        geometry=gpd.points_from_xy(pois_df["lon"], pois_df["lat"]),
        crs="EPSG:4326",
    ).to_crs("EPSG:3035")

    pois_gdf_3035 = pois_gdf_3035[pois_gdf_3035.intersects(roi_buf_3035)]

    if pois_gdf_3035.empty:
        return {"type": "FeatureCollection", "features": []}

    # Convert back to WGS84 for R5 routing inputs
    pois_gdf = pois_gdf_3035.to_crs("EPSG:4326")
    pois_df = pd.DataFrame(pois_gdf.drop(columns="geometry"))

    # Build origins from cell centroids (EPSG:3035 -> EPSG:4326)
    xs_cells = cells["x_mp_100m"].to_numpy(dtype=float)
    ys_cells = cells["y_mp_100m"].to_numpy(dtype=float)
    lons, lats = to_wgs84.transform(xs_cells, ys_cells)

    origins_gdf = gpd.GeoDataFrame(
        {"id": cells["GITTER_ID_100m"].astype(str)},
        geometry=gpd.points_from_xy(lons, lats),
        crs="EPSG:4326",
    )

    # Configure mode and speeds for R5 (walking mode; speed overridden per scenario)
    speed_kwargs = {"speed_walking": WALK_SPEED} if req.mode.lower() == "walk" else {"speed_walking": CYCLE_SPEED}


    travel_time_matrix = TravelTimeMatrix(
        network,
        origins=origins_gdf,
        destinations=pois_gdf,
        transport_modes=[TransportMode.WALK],
        departure=datetime.datetime(2026, 1, 1, 8, 0),
        **speed_kwargs,
    )

    # Attach POI categories to matrix rows to enable per-category aggregation
    tt_with_cat = travel_time_matrix.merge(
        pois_df[["id", "category"]],
        left_on="to_id",
        right_on="id",
        how="left",
    )

    # Minimum travel time per (origin cell, category)
    tt_min_cat = (
        tt_with_cat.groupby(["from_id", "category"])["travel_time"].min().reset_index()
    )

    if tt_min_cat.empty:
        return {"type": "FeatureCollection", "features": []}

    # Pivot to wide format: tt_<category> columns per origin cell id
    wide = tt_min_cat.pivot(
        index="from_id",
        columns="category",
        values="travel_time",
    ).reset_index()

    rename_map = {cat: f"tt_{cat}" for cat in tt_min_cat["category"].unique()}
    wide = wide.rename(columns=rename_map)

    # Join travel time columns back to the grid cell table
    cells = cells.merge(
        wide,
        left_on="GITTER_ID_100m",
        right_on="from_id",
        how="left",
    )

    # Build GeoJSON response with 100m cell polygons and travel time attributes
    features = []
    tt_cols = [c for c in cells.columns if c.startswith("tt_")]

    for _, r in cells.iterrows():
        x = float(r["x_mp_100m"])
        y = float(r["y_mp_100m"])

        geom = cell_polygon_wgs84(x, y)

        props: dict = {
            "id": r["GITTER_ID_100m"],
            "pop": int(r["Bevoelkerungszahl"]) if pd.notna(r["Bevoelkerungszahl"]) else None,
            "district_id": int(r["district_id"]) if pd.notna(r["district_id"]) else None,
        }

        for col in tt_cols:
            val = r[col]
            if pd.isna(val):
                props[col] = None
            else:
                try:
                    f = float(val)
                    props[col] = f if math.isfinite(f) else None
                except Exception:
                    props[col] = None

        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": geom,
            }
        )

    return {"type": "FeatureCollection", "features": features}
