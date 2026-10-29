import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("SignalController")

class SignalController:
    def __init__(self, default_cycle: int = 60, max_capacity_units: float = 20.0):
        self.default_cycle = default_cycle
        self.max_capacity_units = max_capacity_units  # Maximum weighted vehicle units per lane

        # Spatial vehicle weights
        self.weights = {
            "Car": 1.0,
            "Two-wheeler": 0.5,
            "Truck": 3.5,
            "Bus": 4.0,
            "Ambulance": 2.0,
            "Fire Engine": 4.0
        }

        # Internal state
        self.lane_1_color = "GREEN"
        self.lane_2_color = "RED"
        self.lane_1_timer = self.default_cycle
        self.lane_2_timer = self.default_cycle
        self.lane_1_extended = False
        self.lane_2_extended = False
        self.is_preempted = False
        self.preempted_lane: Optional[str] = None
        self.last_update_ts = datetime.utcnow().timestamp()

    def calculate_lane_density(self, detections: List[Dict[str, Any]], lane_id: str) -> float:
        """
        Calculates physical spatial density occupied by vehicles in a lane.
        Applies higher weights: 1 Bus = 4 Cars, 1 Truck = 3.5 Cars, 1 Two-wheeler = 0.5 Cars.
        Returns percentage in [0.0, 100.0].
        """
        lane_vehicles = [d for d in detections if d.get("lane_id") == lane_id]
        total_units = 0.0

        for d in lane_vehicles:
            v_class = d.get("class", "Car")
            w = self.weights.get(v_class, 1.0)
            total_units += w

        density = min(100.0, (total_units / self.max_capacity_units) * 100.0)
        return round(density, 1)

    def update_signals(
        self,
        lane_1_density: float,
        lane_2_density: float,
        emergency_detected: bool,
        emergency_lane: Optional[str] = None,
        elapsed_delta: float = 1.0
    ) -> Dict[str, Any]:
        """
        Evaluates dynamic adaptive logic adjustments & emergency preemption.
        """
        override_reason = None

        # --- Emergency Preemption Vector ("Green Wall Corridor") ---
        if emergency_detected and emergency_lane:
            self.is_preempted = True
            self.preempted_lane = emergency_lane
            override_reason = f"EMERGENCY PREEMPTION: Green Wall activated for {emergency_lane}."

            if emergency_lane == "Lane 1":
                self.lane_1_color = "GREEN"
                self.lane_1_timer = 90
                self.lane_2_color = "RED"
                self.lane_2_timer = 90
            else:
                self.lane_2_color = "GREEN"
                self.lane_2_timer = 90
                self.lane_1_color = "RED"
                self.lane_1_timer = 90

            return self.get_state(override_reason)

        # Clear emergency preemption if no emergency vehicles present
        if self.is_preempted and not emergency_detected:
            self.is_preempted = False
            self.preempted_lane = None

        # Decrement active timers
        if self.lane_1_color == "GREEN":
            self.lane_1_timer = max(0, self.lane_1_timer - int(elapsed_delta))
            self.lane_2_timer = self.lane_1_timer
        else:
            self.lane_2_timer = max(0, self.lane_2_timer - int(elapsed_delta))
            self.lane_1_timer = self.lane_2_timer

        # --- Adaptive Logic Adjustments ---
        # Rule: If Lane 1 Density >= 75% while Lane 2 Density <= 20%
        # Action: Dynamically extend Lane 1 Green light by extra 20 seconds.
        if (
            self.lane_1_color == "GREEN" and
            lane_1_density >= 75.0 and
            lane_2_density <= 20.0 and
            not self.lane_1_extended
        ):
            self.lane_1_timer += 20
            self.lane_2_timer += 20
            self.lane_1_extended = True
            override_reason = f"ADAPTIVE OVERRIDE: Lane 1 Heavy ({lane_1_density}%) vs Lane 2 Low ({lane_2_density}%). Extended +20s."
            logger.info(override_reason)

        # Symmetric Rule: Lane 2 Congestion Override
        elif (
            self.lane_2_color == "GREEN" and
            lane_2_density >= 75.0 and
            lane_1_density <= 20.0 and
            not self.lane_2_extended
        ):
            self.lane_2_timer += 20
            self.lane_1_timer += 20
            self.lane_2_extended = True
            override_reason = f"ADAPTIVE OVERRIDE: Lane 2 Heavy ({lane_2_density}%) vs Lane 1 Low ({lane_1_density}%). Extended +20s."
            logger.info(override_reason)

        # Cycle Transition when timer reaches 0
        if self.lane_1_color == "GREEN" and self.lane_1_timer <= 0:
            self.lane_1_color = "RED"
            self.lane_2_color = "GREEN"
            self.lane_2_timer = self.default_cycle
            self.lane_1_timer = self.default_cycle
            self.lane_1_extended = False
        elif self.lane_2_color == "GREEN" and self.lane_2_timer <= 0:
            self.lane_2_color = "RED"
            self.lane_1_color = "GREEN"
            self.lane_1_timer = self.default_cycle
            self.lane_2_timer = self.default_cycle
            self.lane_2_extended = False

        return self.get_state(override_reason)

    def get_state(self, override_reason: Optional[str] = None) -> Dict[str, Any]:
        return {
            "lane_1": {
                "color": self.lane_1_color,
                "timer": self.lane_1_timer,
                "is_extended": self.lane_1_extended,
                "is_preempted": self.is_preempted and (self.preempted_lane == "Lane 1")
            },
            "lane_2": {
                "color": self.lane_2_color,
                "timer": self.lane_2_timer,
                "is_extended": self.lane_2_extended,
                "is_preempted": self.is_preempted and (self.preempted_lane == "Lane 2")
            },
            "active_corridor": self.preempted_lane,
            "override_reason": override_reason
        }

signal_controller = SignalController()
