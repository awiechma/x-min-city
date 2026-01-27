import datetime
import shapely
from r5py import Isochrones, TransportMode, TravelTimeMatrix

import shapely
from r5py import Isochrones, TransportMode

def calculate_isochrones(network, lat: float, lon: float, mode: str, threshold: int, speed_kmh: float):
    center = shapely.Point(lon, lat)
    mode_l = mode.lower()

    if mode_l == "walk":
        t_modes = [TransportMode.WALK]
        speed_kwargs = {"speed_walking": speed_kmh}
    else:
        t_modes = [TransportMode.WALK] # Ebenfalls walk da Cycling nicht konsistente Ergebnisse liefert
        speed_kwargs = {"speed_walking": speed_kmh}

    iso = Isochrones(
        network,
        origins=center,
        transport_modes=t_modes,
        isochrones=[threshold],
        **speed_kwargs,
    )

    geom = iso.iloc[0].geometry
    poly = geom.convex_hull

    return {
        "type": "Feature",
        "properties": {"travel_time": int(threshold)},
        "geometry": shapely.geometry.mapping(poly),
    }


def build_travel_time_matrix(network, origins_gdf, destinations_gdf, mode: str):
    t_modes = [TransportMode.WALK] if mode.lower() == "walk" else [TransportMode.BICYCLE]
    return TravelTimeMatrix(
        network,
        origins=origins_gdf,
        destinations=destinations_gdf,
        transport_modes=t_modes,
        departure=datetime.datetime(2026, 1, 1, 8, 0),
    )
