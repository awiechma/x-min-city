import pandas as pd
from pyproj import Transformer
from shapely.geometry import Polygon, mapping

from core.config import CSV_PATH_GRID, HALF

to_wgs84 = Transformer.from_crs(3035, 4326, always_xy=True)
to_laea = Transformer.from_crs(4326, 3035, always_xy=True)


def load_grid_df():
    """
    Loads the census grid (100m) CSV and normalizes column types.

    Returns:
        DataFrame with the minimal column set required by the routing pipeline:
        - GITTER_ID_100m (str/int as stored)
        - x_mp_100m, y_mp_100m (float; EPSG:3035 coordinates of cell midpoint)
        - Bevoelkerungszahl (float/int; population)
        - district_id (nullable int)
    """
    df_grid = pd.read_csv(CSV_PATH_GRID, sep=";", encoding="utf-8-sig")

    df_grid["x_mp_100m"] = pd.to_numeric(df_grid["x_mp_100m"], errors="coerce")
    df_grid["y_mp_100m"] = pd.to_numeric(df_grid["y_mp_100m"], errors="coerce")
    df_grid["Bevoelkerungszahl"] = pd.to_numeric(df_grid["Bevoelkerungszahl"], errors="coerce")
    df_grid["district_id"] = pd.to_numeric(df_grid["district_id"], errors="coerce").astype("Int64")

    df_grid = df_grid[
        ["GITTER_ID_100m", "x_mp_100m", "y_mp_100m", "Bevoelkerungszahl", "district_id"]
    ]
    return df_grid


def filter_grid_by_bbox(df_grid, bbox: str | None, limit: int):
    """
    Filters the grid cells to those intersecting a bbox.

    bbox format:
        "minLon,minLat,maxLon,maxLat" in WGS84.

    Implementation detail:
    - The bbox is transformed into EPSG:3035 to compare against cell midpoints.
    - HALF expands the bbox to include cells whose 100m footprint intersects the ROI.
    - If more rows than `limit` remain, the result is truncated to `limit`.
    """
    data = df_grid

    if bbox:
        minLon, minLat, maxLon, maxLat = map(float, bbox.split(","))

        ll = to_laea.transform(minLon, minLat)
        lr = to_laea.transform(maxLon, minLat)
        ul = to_laea.transform(minLon, maxLat)
        ur = to_laea.transform(maxLon, maxLat)

        xs = [ll[0], lr[0], ul[0], ur[0]]
        ys = [ll[1], lr[1], ul[1], ur[1]]
        minX, maxX = min(xs), max(xs)
        minY, maxY = min(ys), max(ys)

        data = data[
            (data["x_mp_100m"] >= minX - HALF)
            & (data["x_mp_100m"] <= maxX + HALF)
            & (data["y_mp_100m"] >= minY - HALF)
            & (data["y_mp_100m"] <= maxY + HALF)
        ]

    if len(data) > limit:
        data = data.iloc[:limit]

    return data


def cell_polygon_wgs84(x: float, y: float):
    """
    Builds a GeoJSON polygon (WGS84) for a 100m grid cell given its midpoint in EPSG:3035.

    Args:
        x, y: cell midpoint coordinates in EPSG:3035 (meters)

    Returns:
        GeoJSON-like mapping for a Polygon in EPSG:4326.
    """
    corners_laea = [
        (x - HALF, y - HALF),
        (x + HALF, y - HALF),
        (x + HALF, y + HALF),
        (x - HALF, y + HALF),
        (x - HALF, y - HALF),
    ]
    ring = [to_wgs84.transform(cx, cy) for (cx, cy) in corners_laea]
    poly = Polygon(ring)
    return mapping(poly)
