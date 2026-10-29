from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime

class BoundingBox(BaseModel):
    ymin: float
    xmin: float
    ymax: float
    xmax: float

class VehicleDetection(BaseModel):
    track_id: str
    vehicle_class: str = Field(..., description="Car, Bus, Truck, Two-wheeler, Ambulance, Fire Engine")
    box_2d: List[float] = Field(..., description="Normalized [ymin, xmin, ymax, xmax] in 0..1000")
    lane_id: str = "Lane 1"
    velocity_vector: List[float] = [0.0, 0.0]
    confidence: float = 0.90
    license_plate: Optional[str] = None

class VehicleCounts(BaseModel):
    cars: int = 0
    buses: int = 0
    trucks: int = 0
    two_wheelers: int = 0
    emergency_vehicles: int = 0
    total: int = 0

class LaneSignalState(BaseModel):
    color: str = "GREEN"  # GREEN, YELLOW, RED
    timer: int = 60
    is_extended: bool = False
    is_preempted: bool = False

class SignalSystemState(BaseModel):
    lane_1: LaneSignalState
    lane_2: LaneSignalState
    active_corridor: Optional[str] = None
    override_reason: Optional[str] = None

class ViolationRecord(BaseModel):
    violation_id: str
    timestamp: str
    violation_type: str = Field(..., description="RED_LIGHT_CROSSING, WRONG_WAY_DRIVING")
    vehicle_type: str
    license_plate: str
    confidence: float
    lane_id: str
    image_snapshot: Optional[str] = None
    notification_status: str = "PENDING"
    details: Optional[str] = None

class TelemetrySnapshot(BaseModel):
    timestamp: str
    lane_1_density: float
    lane_2_density: float
    signal_state: SignalSystemState
    counts: VehicleCounts
    active_violations_count: int = 0
