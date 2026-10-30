import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from .models import Base

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "traffic_system.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Safe auto-migration for newly added columns in SQLite
    with engine.connect() as conn:
        # Check and add columns to violations table
        cols_to_add = [
            ("violations", "legal_act_section", "VARCHAR(200) DEFAULT 'Section 112 r/w Section 183 MV Act'"),
            ("violations", "legal_act_rule", "VARCHAR(200) DEFAULT 'CMVR Rule 118'"),
            ("violations", "penalty_range", "VARCHAR(100) DEFAULT 'Rs. 1,000 - Rs. 2,000'"),
            ("violations", "verification_status", "VARCHAR(50) DEFAULT 'Pending Review'"),
            ("violations", "is_blurry", "BOOLEAN DEFAULT 0"),
            ("violations", "blur_score", "FLOAT DEFAULT 100.0"),
            ("violations", "candidates_json", "TEXT DEFAULT NULL"),
            ("hourly_reports", "pedestrians_count", "INTEGER DEFAULT 0"),
            ("hourly_reports", "children_count", "INTEGER DEFAULT 0"),
            ("hourly_reports", "start_time", "DATETIME DEFAULT NULL"),
            ("hourly_reports", "end_time", "DATETIME DEFAULT NULL"),
        ]
        for tbl, col, col_def in cols_to_add:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}"))
                conn.commit()
            except Exception:
                pass # Column already exists

    # Seed official Indian Police Administration Hierarchy if table empty
    from .models import PoliceOfficer
    db = SessionLocal()
    try:
        if db.query(PoliceOfficer).count() == 0:
            seed_officers = [
                PoliceOfficer(
                    badge_id="TN-HQ-DGP-001",
                    name="Shri Shankar Jiwal, IPS",
                    rank="Director General of Police (DGP)",
                    role="Head of Police Force (HoPF)",
                    city="Chennai (State HQ)",
                    zone="Tamil Nadu State Jurisdiction",
                    sub_division="State Command Headquarters",
                    station="Chief Police Office, Radhakrishnan Salai",
                    assigned_cameras="All Tamil Nadu ITMS Nodes",
                    status="Active / State Command",
                    contact_number="+91 44 2844 8000"
                ),
                PoliceOfficer(
                    badge_id="TN-HQ-ADGP-014",
                    name="Dr. K. Bhavaneeswari, IPS",
                    rank="Additional Director General of Police (ADGP)",
                    role="Chief of Traffic & Road Safety",
                    city="Chennai",
                    zone="Tamil Nadu Traffic Directorate",
                    sub_division="Statewide Highway & Urban Safety",
                    station="Traffic Planning & Monitoring Cell",
                    assigned_cameras="State Arterial Corridors",
                    status="Active / Directorate",
                    contact_number="+91 44 2844 8020"
                ),
                PoliceOfficer(
                    badge_id="TN-CBE-COP-002",
                    name="V. Balakrishnan, IPS",
                    rank="Commissioner of Police (CoP)",
                    role="City Police Commissioner",
                    city="Coimbatore",
                    zone="Coimbatore City Commissionerate",
                    sub_division="Metropolitan Urban Grid",
                    station="City Police Commissioner Office, Huzur Rd",
                    assigned_cameras="All 12 Coimbatore Corridor Nodes",
                    status="Active / City Command",
                    contact_number="+91 422 230 0250"
                ),
                PoliceOfficer(
                    badge_id="TN-CBE-DCP-102",
                    name="K. Saravanakumar, IPS",
                    rank="Deputy Commissioner of Police (DCP - Traffic)",
                    role="Zonal Traffic Commander",
                    city="Coimbatore",
                    zone="Coimbatore Traffic Zone (East & West)",
                    sub_division="City Traffic Enforcement Division",
                    station="Traffic Control Room, Old Flyover Junction",
                    assigned_cameras="Nodes v1 - v14",
                    status="Active / On-Duty",
                    contact_number="+91 422 230 3344"
                ),
                PoliceOfficer(
                    badge_id="TN-CBE-ACP-304",
                    name="R. Muthuvel, TPS",
                    rank="Assistant Commissioner of Police (ACP)",
                    role="Sub-Divisional Traffic Officer",
                    city="Coimbatore",
                    zone="Coimbatore East",
                    sub_division="Peelamedu Sub-Division",
                    station="Peelamedu Traffic Sub-Division HQ",
                    assigned_cameras="Nodes v1, v2, v3, v4",
                    status="Active / Field Operations",
                    contact_number="+91 94454 88102"
                ),
                PoliceOfficer(
                    badge_id="TN-CBE-INS-512",
                    name="M. Karthikeyan",
                    rank="Traffic Inspector (TI)",
                    role="Corridor Enforcement Chief",
                    city="Coimbatore",
                    zone="Coimbatore East",
                    sub_division="Peelamedu Sub-Division",
                    station="Gandhipuram Traffic Police Station",
                    assigned_cameras="Avinashi Road & Gandhipuram Central",
                    status="Active / Patrol Command",
                    contact_number="+91 94454 88105"
                ),
                PoliceOfficer(
                    badge_id="TN-CBE-TR-1048",
                    name="Dharshana B",
                    rank="Sub-Inspector of Police (SI)",
                    role="Admin / Authorized Digital e-Challan Issuing Officer",
                    city="Coimbatore",
                    zone="Coimbatore East",
                    sub_division="Peelamedu Sub-Division",
                    station="Peelamedu Traffic Enforcement Wing",
                    assigned_cameras="Nodes v1, v2, v5, v7, Live Feed 01",
                    status="Active / Lead Reviewer",
                    contact_number="+91 94454 88100"
                ),
                PoliceOfficer(
                    badge_id="TN-CBE-HC-2041",
                    name="S. Palaniswamy",
                    rank="Head Constable (HC - Traffic)",
                    role="Mobile Interceptor & Field Audit",
                    city="Coimbatore",
                    zone="Coimbatore East",
                    sub_division="Peelamedu Sub-Division",
                    station="Hope College Outpost",
                    assigned_cameras="Node v1, v2",
                    status="Active / Field Patrol",
                    contact_number="+91 94454 88108"
                )
            ]
            db.add_all(seed_officers)
            db.commit()
    except Exception as e:
        print(f"[init_db] Note seeding police officers: {e}")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
