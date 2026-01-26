from pydantic import BaseModel
from typing import Optional, List

class IsochroneRequest(BaseModel):
    lat: float
    lon: float
    mode: str
    threshold: int

class PoisRequest(BaseModel):
    bbox: list[float]         
    categories: list[str]     

class UserPoi(BaseModel):
    lat: float
    lon: float
    category: str
    name: Optional[str] = None

class CityScopeRequest(BaseModel):
    bbox: str
    categories: list[str]
    mode: str
    currentMinutes: int
    user_pois: Optional[List[UserPoi]] = None
    removed_poi_ids: Optional[List[int]] = None
