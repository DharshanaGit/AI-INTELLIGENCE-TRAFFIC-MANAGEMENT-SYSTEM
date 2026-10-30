import time

class DynamicSignalController:
    def __init__(self, min_green: int = 10, max_green: int = 40, yellow_time: int = 3):
        self.min_green = min_green
        self.max_green = max_green
        self.yellow_time = yellow_time
        
        self.lanes = [1, 2, 3, 4]
        self.active_green_lane = 1
        self.phase_state = "GREEN"  # "GREEN", "YELLOW"
        self.time_in_phase = 0.0
        self.current_phase_duration = 15.0  # Dynamic duration in seconds
        self.last_update_time = time.time()
        
        self.emergency_override = False
        self.emergency_lane = None

    def update(self, lane_counts: dict, emergency_lane: int = None):
        """
        Updates the signal controller state based on elapsed real time and lane vehicle counts.
        lane_counts: dict {1: count, 2: count, 3: count, 4: count}
        emergency_lane: lane id of detected ambulance/fire engine if any
        """
        now = time.time()
        dt = now - self.last_update_time
        self.last_update_time = now
        self.time_in_phase += dt

        # Handle Emergency Preemption
        if emergency_lane in self.lanes:
            if not self.emergency_override or self.active_green_lane != emergency_lane:
                print(f"[SignalController] EMERGENCY VEHICLE DETECTED in Lane {emergency_lane}! Preempting signal.")
                self.emergency_override = True
                self.emergency_lane = emergency_lane
                self.active_green_lane = emergency_lane
                self.phase_state = "GREEN"
                self.time_in_phase = 0.0
                self.current_phase_duration = 30.0
            return self.get_states()
        elif self.emergency_override and emergency_lane is None:
            # Emergency cleared
            print("[SignalController] Emergency vehicle cleared. Resuming dynamic cycle.")
            self.emergency_override = False
            self.emergency_lane = None
            self.phase_state = "YELLOW"
            self.time_in_phase = 0.0
            self.current_phase_duration = self.yellow_time

        # Normal adaptive phase progression
        if self.phase_state == "GREEN":
            if self.time_in_phase >= self.current_phase_duration:
                # Transition to YELLOW
                self.phase_state = "YELLOW"
                self.time_in_phase = 0.0
                self.current_phase_duration = self.yellow_time
        elif self.phase_state == "YELLOW":
            if self.time_in_phase >= self.yellow_time:
                # Pick next green lane: prioritize lane with highest vehicle count
                current_idx = self.lanes.index(self.active_green_lane)
                
                # Check densities
                other_lanes = [l for l in self.lanes if l != self.active_green_lane]
                # Sort other lanes by vehicle count descending, fallback to round-robin
                other_lanes.sort(key=lambda l: lane_counts.get(l, 0), reverse=True)
                
                next_lane = other_lanes[0] if lane_counts.get(other_lanes[0], 0) > 0 else self.lanes[(current_idx + 1) % len(self.lanes)]
                
                self.active_green_lane = next_lane
                self.phase_state = "GREEN"
                self.time_in_phase = 0.0
                
                # Dynamic green time calculation: Base + 2.5s per queued vehicle
                count = lane_counts.get(next_lane, 0)
                calculated_green = self.min_green + (count * 2.5)
                self.current_phase_duration = min(self.max_green, max(self.min_green, calculated_green))

        return self.get_states()

    def get_states(self):
        """
        Returns {lane_id: 'GREEN' | 'YELLOW' | 'RED'}, countdown, active_lane
        """
        states = {}
        for l in self.lanes:
            if l == self.active_green_lane:
                states[l] = self.phase_state
            else:
                states[l] = "RED"
                
        remaining_seconds = max(0, int(self.current_phase_duration - self.time_in_phase))
        return {
            "signals": states,
            "active_green_lane": self.active_green_lane,
            "phase_state": self.phase_state,
            "remaining_seconds": remaining_seconds,
            "phase_duration": int(self.current_phase_duration),
            "emergency_override": self.emergency_override
        }
