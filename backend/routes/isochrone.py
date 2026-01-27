from fastapi import APIRouter, HTTPException, Request
from core.schemas import IsochroneRequest
from services.routing import calculate_isochrones

router = APIRouter(prefix="/api", tags=["isochrone"])

@router.post("/isochrone")
def returnIsochrones(req: IsochroneRequest, request: Request):
    st = request.app.state.app_state
    if st.network_status != "ready":
        raise HTTPException(status_code=500, detail="Transport network not yet ready")

    if req.mode.lower() == "walk":
        speed_kmh = 5  # km/h
    else:
        speed_kmh = 20  # km/h

    return calculate_isochrones(
        network=st.network,
        lat=req.lat,
        lon=req.lon,
        mode="walk",
        threshold=req.threshold,
        speed_kmh=speed_kmh,
    )
