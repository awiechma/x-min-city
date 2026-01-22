from fastapi import APIRouter, HTTPException, Request
from core.schemas import PoisRequest
from core.config import CATS

import pandas as pd
import math

router = APIRouter(prefix="/api", tags=["pois"])


@router.post("/pois")
async def api_pois(req: PoisRequest, request: Request):
    if len(req.bbox) != 4:
        raise HTTPException(status_code=400, detail="bbox must be [south,west,north,east]")

    cats = [c.lower() for c in req.categories if c.lower() in CATS]
    if not cats:
        return {"pois": []}

    s, w, n, e = req.bbox

    pois = []

    for cat in cats:
        df_cat = request.app.state.app_state.poi_cache.get(cat)
        if df_cat is None or df_cat.empty:
            continue

        mask = (
            (df_cat["lat"] >= s) &
            (df_cat["lat"] <= n) &
            (df_cat["lon"] >= w) &
            (df_cat["lon"] <= e)
        )
        sub = df_cat.loc[mask]

        for _, row in sub.iterrows():
            lat = row.get("lat")
            lon = row.get("lon")

            ok = True
            try:
                lat_f = float(lat)
                lon_f = float(lon)
                if not (math.isfinite(lat_f) and math.isfinite(lon_f)):
                    ok = False
            except Exception:
                ok = False

            if not ok:
                print("\n[POIS INVALID ROW]")
                print(f"requested_category={cat}")
                print(f"id={row.get('id')}")
                print(f"raw_lat={lat!r} raw_lon={lon!r}")
                print(f"row={row.to_dict()}")
                print("[/POIS INVALID ROW]\n")
                continue

            name = row.get("name")
            if pd.isna(name):
                name = None

            pois.append({
                "id": row["id"],
                "lat": lat_f,
                "lon": lon_f,
                "category": row["category"],
                "name": name,
            })

    return {"pois": pois}
