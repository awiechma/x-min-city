from fastapi import APIRouter, Request
from services.districts import districts_to_geojson

router = APIRouter(prefix="/api", tags=["districts"])

@router.get("/districts")
def api_districts(request: Request):
    districts_gdf = request.app.state.app_state.districts_gdf
    return districts_to_geojson(districts_gdf)
