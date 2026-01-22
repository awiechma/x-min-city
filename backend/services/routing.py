import datetime
import shapely
from r5py import Isochrones, TransportMode, TravelTimeMatrix

def calculate_isochrones(network, lat: float, lon: float, mode: str, threshold: int):
    center = shapely.Point(lon, lat)
    t_modes = [TransportMode.WALK] if mode.lower() == "walk" else [TransportMode.BICYCLE]

    iso = Isochrones(
        network,
        origins=center,
        transport_modes=t_modes,
        isochrones=[threshold],
    )

    geom = iso.iloc[0].geometry
    poly = geom.convex_hull

    fc = {
        "type": "Feature",
        "properties": {"travel_time": int(threshold)},
        "geometry": shapely.geometry.mapping(poly),
    }
    return fc

def build_travel_time_matrix(network, origins_gdf, destinations_gdf, mode: str):
    t_modes = [TransportMode.WALK] if mode.lower() == "walk" else [TransportMode.BICYCLE]
    return TravelTimeMatrix(
        network,
        origins=origins_gdf,
        destinations=destinations_gdf,
        transport_modes=t_modes,
        departure=datetime.datetime(2026, 1, 1, 8, 0),
    )
