from fastapi import APIRouter, HTTPException, Request
from core.schemas import IsochroneRequest
from services.routing import calculate_isochrones

router = APIRouter(prefix="/api", tags=["isochrone"])

@router.post("/isochrone")
def returnIsochrones(req: IsochroneRequest, request: Request):
    st = request.app.state.app_state
    if st.network_status != "ready":
        raise HTTPException(status_code=500, detail="Transport network not yet ready")

    return calculate_isochrones(
        network=st.network,
        lat=req.lat,
        lon=req.lon,
        mode=req.mode,
        threshold=req.threshold
    )
