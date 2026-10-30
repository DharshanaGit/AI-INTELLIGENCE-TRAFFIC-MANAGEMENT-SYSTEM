from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    vehicle_id = Column(Integer, nullable=False)
    vehicle_type = Column(String(50), default="Car")
    violation_type = Column(String(100), nullable=False) # "Signal Jumping", "Wrong-Way Driving", "Overspeeding", "No Helmet"
    legal_act_section = Column(String(200), default="Section 112 r/w Section 183, Motor Vehicles Act 1988")
    legal_act_rule = Column(String(200), default="CMVR Rule 118")
    penalty_range = Column(String(100), default="Rs. 1,000 - Rs. 2,000")
    license_plate = Column(String(30), nullable=False)
    confidence = Column(Float, default=0.92)
    is_blurry = Column(Boolean, default=False)
    blur_score = Column(Float, default=100.0)
    candidates_json = Column(Text, nullable=True)
    speed = Column(Float, default=0.0) # km/h
    lane_id = Column(Integer, default=1)
    snapshot_path = Column(String(255), nullable=True)
    challan_pdf_path = Column(String(255), nullable=True)
    status = Column(String(30), default="Issued") # "Issued", "Paid"
    verification_status = Column(String(50), default="Pending Review") # "Pending Review", "Verified", "Dismissed"
    fine_amount = Column(Integer, default=1000)

class TrafficLog(Base):
    __tablename__ = "traffic_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    lane_1_count = Column(Integer, default=0)
    lane_2_count = Column(Integer, default=0)
    lane_3_count = Column(Integer, default=0)
    lane_4_count = Column(Integer, default=0)
    total_vehicles = Column(Integer, default=0)
    congestion_index = Column(Float, default=0.0)
    active_green_lane = Column(Integer, default=1)
    emergency_active = Column(Boolean, default=False)

class HourlyReport(Base):
    __tablename__ = "hourly_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    hour_label = Column(String(80), nullable=False) # e.g. "2026-10-30 15:00 - 16:00 UTC"
    total_vehicles = Column(Integer, default=0)
    cars_count = Column(Integer, default=0)
    two_wheelers_count = Column(Integer, default=0)
    auto_rickshaws_count = Column(Integer, default=0)
    buses_count = Column(Integer, default=0)
    trucks_count = Column(Integer, default=0)
    pedestrians_count = Column(Integer, default=0)
    children_count = Column(Integer, default=0)
    total_violations = Column(Integer, default=0)
    fines_issued = Column(Integer, default=0)
    avg_congestion = Column(Float, default=0.0)
    report_filename = Column(String(255), nullable=True)
    mode_source = Column(String(50), default="Live Surveillance")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

class PoliceOfficer(Base):
    __tablename__ = "police_officers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    badge_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    rank = Column(String(80), nullable=False)
    role = Column(String(100), nullable=False)
    city = Column(String(80), nullable=False)
    zone = Column(String(80), nullable=False)
    sub_division = Column(String(80), nullable=False)
    station = Column(String(120), nullable=False)
    assigned_cameras = Column(String(255), default="All Grid Nodes")
    status = Column(String(40), default="Active / On-Duty")
    contact_number = Column(String(30), default="+91 94454 00000")
    created_at = Column(DateTime, default=datetime.utcnow)
