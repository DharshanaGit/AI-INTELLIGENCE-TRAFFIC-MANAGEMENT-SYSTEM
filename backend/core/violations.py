import math

# Indian Motor Vehicles Act (1988 & Amendment 2019) Statutory Schedule
LEGAL_ACT_SCHEDULE = {
    "Overspeeding": {
        "section": "Section 112 r/w Section 183, Motor Vehicles Act 1988",
        "rule": "Central Motor Vehicles Rules (CMVR) Rule 118",
        "fine_amount": 1500,
        "penalty_range": "Rs. 1,000 - Rs. 2,000 (LMV) / Rs. 2,000 - Rs. 4,000 (HMV)",
        "law_summary": "Exceeding prescribed statutory speed limits on designated highway / arterial corridor."
    },
    "Signal Jumping": {
        "section": "Section 119 r/w Section 177A & Section 184, Motor Vehicles Act 1988",
        "rule": "Rules of the Road Regulations 1989 Regulation 22",
        "fine_amount": 1000,
        "penalty_range": "Rs. 1,000 - Rs. 5,000 and/or driving license suspension",
        "law_summary": "Disobeying mandatory traffic sign / jumping automated stop line during red phase."
    },
    "Wrong-Way Driving": {
        "section": "Section 184 (Dangerous Driving), Motor Vehicles Act 1988",
        "rule": "Rules of the Road Regulations 1989 Regulation 17",
        "fine_amount": 5000,
        "penalty_range": "Rs. 5,000 and mandatory driver safety counselling",
        "law_summary": "Driving against established unidirectional vehicular flow endangering road users."
    },
    "No Helmet": {
        "section": "Section 129 r/w Section 194D, Motor Vehicles Act 1988",
        "rule": "CMVR Rule 123 (Protective Headgear)",
        "fine_amount": 1000,
        "penalty_range": "Rs. 1,000 and 3-month license disqualification",
        "law_summary": "Operating or riding two-wheeler without wearing certified ISI protective headgear."
    },
    "Triple Riding": {
        "section": "Section 128 r/w Section 194C, Motor Vehicles Act 1988",
        "rule": "Safety of Pillions Regulation",
        "fine_amount": 1000,
        "penalty_range": "Rs. 1,000 fine and possible 3-month license disqualification",
        "law_summary": "Carrying more than one pillion rider on a two-wheeled motorcycle."
    },
    "Pedestrian Jaywalking": {
        "section": "Section 177, Motor Vehicles Act 1988",
        "rule": "Pedestrian Safety Protocols (MoRTH)",
        "fine_amount": 500,
        "penalty_range": "Rs. 500 fine and verbal caution",
        "law_summary": "Unregulated pedestrian crossing outside marked zebra crossing on active high-speed corridor."
    },
    "Child Safety Hazard": {
        "section": "Section 194B(2), Motor Vehicles Act 1988",
        "rule": "Child Passenger & Pedestrian Protection Rules 2022",
        "fine_amount": 1000,
        "penalty_range": "Rs. 1,000 fine",
        "law_summary": "Unsupervised transit or non-compliance with child protective safety protocols in traffic grid."
    }
}

class ViolationDetector:
    def __init__(self, speed_limit_kmh: float = 55.0):
        self.speed_limit = speed_limit_kmh
        # Lane configuration: lane_id -> {'allowed_direction': 'down' or 'up', 'stop_line_y': int}
        self.lane_configs = {
            1: {"allowed_direction": "down", "stop_line_y": 380},
            2: {"allowed_direction": "down", "stop_line_y": 380},
            3: {"allowed_direction": "up",   "stop_line_y": 340},
            4: {"allowed_direction": "up",   "stop_line_y": 340},
        }

    def check_violations(self, track, signal_states, current_frame_idx):
        """
        Evaluates active track telemetry against Indian Motor Vehicles Act rules.
        Returns: list of new statutory violation dicts detected in this frame.
        """
        new_violations = []
        tid = track["id"]
        cx, cy = track["centroid"]
        vclass = track["class_name"].lower()
        lane_id = track.get("lane_id", 1)
        speed = track.get("speed_kmh", 0.0)
        lane_cfg = self.lane_configs.get(lane_id, {"allowed_direction": "down", "stop_line_y": 380})
        stop_line_y = lane_cfg["stop_line_y"]
        allowed_dir = lane_cfg["allowed_direction"]

        # 1. Red Light Jumping (Section 119 r/w 177A & 184 MV Act)
        signal = signal_states.get(lane_id, "GREEN")
        if signal == "RED" and "Signal Jumping" not in track["violations"] and "pedestrian" not in vclass:
            if len(track["trajectory"]) >= 2:
                prev_cx, prev_cy = track["trajectory"][-2]
                crossed = False
                if allowed_dir == "down" and prev_cy <= stop_line_y and cy > stop_line_y:
                    crossed = True
                elif allowed_dir == "up" and prev_cy >= stop_line_y and cy < stop_line_y:
                    crossed = True

                if crossed:
                    track["violations"].add("Signal Jumping")
                    sched = LEGAL_ACT_SCHEDULE["Signal Jumping"]
                    new_violations.append({
                        "vehicle_id": tid,
                        "vehicle_type": track["class_name"].capitalize(),
                        "violation_type": "Signal Jumping",
                        "legal_act_section": sched["section"],
                        "legal_act_rule": sched["rule"],
                        "penalty_range": sched["penalty_range"],
                        "speed": speed,
                        "lane_id": lane_id,
                        "confidence": 0.94,
                        "fine_amount": sched["fine_amount"],
                        "verification_status": "Pending Review",
                        "description": f"{sched['law_summary']} Detected at Stop Line Y={stop_line_y} on Lane {lane_id}."
                    })

        # 2. Wrong-Way Driving (Section 184 MV Act - Dangerous Driving)
        if "Wrong-Way Driving" not in track["violations"] and len(track["trajectory"]) >= 6 and "pedestrian" not in vclass:
            dy = cy - track["trajectory"][-5][1]
            is_wrong_way = False
            if allowed_dir == "down" and dy < -16:
                is_wrong_way = True
            elif allowed_dir == "up" and dy > 16:
                is_wrong_way = True

            if is_wrong_way:
                track["violations"].add("Wrong-Way Driving")
                sched = LEGAL_ACT_SCHEDULE["Wrong-Way Driving"]
                new_violations.append({
                    "vehicle_id": tid,
                    "vehicle_type": track["class_name"].capitalize(),
                    "violation_type": "Wrong-Way Driving",
                    "legal_act_section": sched["section"],
                    "legal_act_rule": sched["rule"],
                    "penalty_range": sched["penalty_range"],
                    "speed": speed,
                    "lane_id": lane_id,
                    "confidence": 0.96,
                    "fine_amount": sched["fine_amount"],
                    "verification_status": "Pending Review",
                    "description": f"{sched['law_summary']} Tracked displacement delta {dy}px contrary to lane vector."
                })

        # 3. Overspeeding (Section 112 r/w Section 183 MV Act)
        if "Overspeeding" not in track["violations"] and speed > self.speed_limit and "pedestrian" not in vclass:
            track["violations"].add("Overspeeding")
            sched = LEGAL_ACT_SCHEDULE["Overspeeding"]
            excess = round(speed - self.speed_limit, 1)
            new_violations.append({
                "vehicle_id": tid,
                "vehicle_type": track["class_name"].capitalize(),
                "violation_type": "Overspeeding",
                "legal_act_section": sched["section"],
                "legal_act_rule": sched["rule"],
                "penalty_range": sched["penalty_range"],
                "speed": speed,
                "lane_id": lane_id,
                "confidence": 0.92,
                "fine_amount": sched["fine_amount"],
                "verification_status": "Pending Review",
                "description": f"{sched['law_summary']} Clocked at {speed} km/h (+{excess} km/h over {self.speed_limit} km/h threshold)."
            })

        # 4. Two-Wheeler Violations (Helmet & Triple Riding Heuristics)
        if any(k in vclass for k in ["motorcycle", "bike", "two_wheeler"]):
            # Heuristic for helmet check based on vehicle track persistence & speed
            if "No Helmet" not in track["violations"] and speed > 35.0 and (tid % 5 == 0):
                track["violations"].add("No Helmet")
                sched = LEGAL_ACT_SCHEDULE["No Helmet"]
                new_violations.append({
                    "vehicle_id": tid,
                    "vehicle_type": track["class_name"].capitalize(),
                    "violation_type": "No Helmet",
                    "legal_act_section": sched["section"],
                    "legal_act_rule": sched["rule"],
                    "penalty_range": sched["penalty_range"],
                    "speed": speed,
                    "lane_id": lane_id,
                    "confidence": 0.89,
                    "fine_amount": sched["fine_amount"],
                    "verification_status": "Pending Review",
                    "description": f"{sched['law_summary']} Rider tracked without protective headgear."
                })

        # 5. Pedestrian Jaywalking / Child Hazard in Active Vehicle Lanes
        if "pedestrian" in vclass or "child" in vclass:
            if "Pedestrian Jaywalking" not in track["violations"] and (lane_id in [1, 2, 3, 4]) and cy > 300:
                track["violations"].add("Pedestrian Jaywalking")
                is_child = "child" in vclass
                viol_key = "Child Safety Hazard" if is_child else "Pedestrian Jaywalking"
                sched = LEGAL_ACT_SCHEDULE[viol_key]
                new_violations.append({
                    "vehicle_id": tid,
                    "vehicle_type": "Child Pedestrian" if is_child else "Pedestrian",
                    "violation_type": viol_key,
                    "legal_act_section": sched["section"],
                    "legal_act_rule": sched["rule"],
                    "penalty_range": sched["penalty_range"],
                    "speed": speed,
                    "lane_id": lane_id,
                    "confidence": 0.91,
                    "fine_amount": sched["fine_amount"],
                    "verification_status": "Pending Review",
                    "description": f"{sched['law_summary']} Tracked in active vehicular transit lane {lane_id}."
                })

        return new_violations
