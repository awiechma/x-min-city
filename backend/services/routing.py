import datetime
import shapely
from r5py import Isochrones, TransportMode, TravelTimeMatrix
from core.config import WALK_SPEED, CYCLE_SPEED

def calculate_isochrones(network, lat: float, lon: float, mode: str, threshold: int):
    """
    Calculates a single isochrone polygon for the given origin and time threshold.

    Notes:
    - R5 is configured with WALK transport mode for both "walk" and "bike".
      For cycling, speed is approximated by adjusting `speed_walking` because
      TransportMode.BICYCLE produced inconsistent results in this project setup.
    - The returned geometry is converted to a convex hull to ensure a valid, simple polygon.

    Returns:
        GeoJSON Feature with:
        - properties.travel_time (minutes)
        - geometry (Polygon)
    """

    center = shapely.Point(lon, lat)
    mode_l = mode.lower()

    if mode_l == "walk":
        t_modes = [TransportMode.WALK]
        speed_kwargs = {"speed_walking": WALK_SPEED}
    else:
        # Cycling is approximated via walking mode + adjusted speed due to inconsistencies via CYCLING
        t_modes = [TransportMode.WALK]
        speed_kwargs = {"speed_walking": CYCLE_SPEED}


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
    """
    Builds an R5 TravelTimeMatrix between origin points and destination points.

    - For walking: uses TransportMode.WALK
    - For cycling: uses TransportMode.BICYCLE (if supported and stable in the environment)

    Returns:
        TravelTimeMatrix (r5py)
    """
    t_modes = [TransportMode.WALK] if mode.lower() == "walk" else [TransportMode.BICYCLE]
    return TravelTimeMatrix(
        network,
        origins=origins_gdf,
        destinations=destinations_gdf,
        transport_modes=t_modes,
        departure=datetime.datetime(2026, 1, 1, 8, 0),
    )
