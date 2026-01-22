from fastapi import FastAPI
import asyncio
from r5py import TransportNetwork

from core.state import AppState
from core.config import OSM_PBF, heightmodel, CITY_BBOX, CATS

from services.overpass import fetch_pois_for_category
from services.zensus import load_grid_df
from services.districts import load_districts_gdf

from routes.isochrone import router as isochrone_router
from routes.pois import router as pois_router
from routes.grid import router as grid_router
from routes.districts import router as districts_router
from routes.cityscope import router as cityscope_router

app = FastAPI()
app.state.app_state = AppState()

@app.on_event("startup")
async def startup():
    st = app.state.app_state

    st.network_status = "not ready"
    st.network = TransportNetwork(OSM_PBF, elevation_model=heightmodel)
    st.network_status = "ready"
    print("Netzwerk geladen")

    st.df_grid = load_grid_df()
    st.districts_gdf = load_districts_gdf()

    st.poi_cache = {}
    print("Starte Initialisierung des POI-Caches...")
    for cat in CATS.keys():
        df_cat = await fetch_pois_for_category(cat, CITY_BBOX)
        st.poi_cache[cat] = df_cat
        print(f"  Kategorie '{cat}': {len(df_cat)} POIs gecached.")
        await asyncio.sleep(5)
    print("POI-Cache initialisiert.")

app.include_router(isochrone_router)
app.include_router(pois_router)
app.include_router(grid_router)
app.include_router(districts_router)
app.include_router(cityscope_router)