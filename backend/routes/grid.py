from fastapi import APIRouter, Query, Request
from services.zensus import filter_grid_by_bbox, cell_polygon_wgs84
import pandas as pd

router = APIRouter(prefix="/api", tags=["grid"])

@router.get("/grid")
def api_grid(
    request: Request,
    bbox: str | None = Query(None),
    limit: int = Query(20000, ge=1, le=200000),
):
    df_grid = request.app.state.app_state.df_grid
    data = filter_grid_by_bbox(df_grid, bbox, limit)

    features = []
    for _, r in data.iterrows():
        geom = cell_polygon_wgs84(float(r["x_mp_100m"]), float(r["y_mp_100m"]))
        features.append({
            "type": "Feature",
            "properties": {
                "id": r["GITTER_ID_100m"],
                "pop": int(r["Bevoelkerungszahl"]) if pd.notna(r["Bevoelkerungszahl"]) else None,
            },
            "geometry": geom,
        })

    return {"type": "FeatureCollection", "features": features}
