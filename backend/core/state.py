from dataclasses import dataclass, field
from typing import Optional
import pandas as pd
from r5py import TransportNetwork

@dataclass
class AppState:
    network_status: str = "not ready"
    network: Optional[TransportNetwork] = None
    poi_cache: dict[str, pd.DataFrame] = field(default_factory=dict)
    df_grid: Optional[pd.DataFrame] = None
    districts_gdf = None
