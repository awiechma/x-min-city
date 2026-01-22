import geopandas as gpd
from shapely.geometry import mapping
from core.config import DISTRICTS_SHP, DISTRICT_ID_COL

def load_districts_gdf():
    districts_gdf = gpd.read_file(DISTRICTS_SHP)
    districts_gdf = districts_gdf.to_crs(epsg=4326)
    return districts_gdf

def districts_to_geojson(districts_gdf):
    features = []

    for _, r in districts_gdf.iterrows():
        geom = r["geometry"]
        if geom is None or geom.is_empty:
            continue

        props = {"district_id": int(r[DISTRICT_ID_COL])}
        if "name" in districts_gdf.columns:
            props["name"] = r["name"]

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": mapping(geom),
        })

    return {"type": "FeatureCollection", "features": features}
