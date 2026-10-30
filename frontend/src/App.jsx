import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, 
  AlertTriangle, 
  Gauge, 
  Video, 
  Layers, 
  ShieldAlert, 
  Search, 
  Bell, 
  ChevronDown, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Send, 
  Plus, 
  Minus, 
  Sun, 
  CloudSun, 
  CheckCircle2, 
  Clock, 
  Download, 
  X, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Compass, 
  FileText, 
  Camera, 
  Settings, 
  Radio, 
  Info, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Activity, 
  Eye, 
  EyeOff,
  Grid, 
  MoreVertical, 
  ChevronRight, 
  Check, 
  FileSpreadsheet, 
  FileCode, 
  HardDrive, 
  Cpu, 
  Users, 
  BellRing, 
  Map, 
  Database, 
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  Upload,
  PlayCircle,
  Repeat,
  Mail,
  Key,
  Shield,
  Printer,
  Lock,
  Unlock,
  LogOut,
  UserCheck,
  UserPlus,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  CornerDownRight,
  ShieldAlert as PoliceBadge,
  Sparkles,
  Server
} from 'lucide-react';

const API_BASE = "http://localhost:8005";
const WS_URL = "ws://localhost:8005/ws/telemetry";

// City Data Configurations for Coimbatore and Chennai
const CITY_DATA = {
  Coimbatore: {
    name: "Coimbatore",
    tagline: "Coimbatore City Traffic Police (CCTP) • Smart City ITMS",
    weather: "28°C Clear Sky",
    skylineTitle: "Western Ghats Foothills",
    intersections: [
      { name: "Gandhipuram", status: "High", count: "4,210 veh/h", color: "#ef4444" },
      { name: "Avinashi Road", status: "Moderate", count: "3,890 veh/h", color: "#f59e0b" },
      { name: "Peelamedu", status: "Smooth", count: "2,150 veh/h", color: "#10b981" },
      { name: "Sathy Road", status: "Moderate", count: "3,120 veh/h", color: "#f59e0b" },
      { name: "RS Puram", status: "High", count: "3,940 veh/h", color: "#ef4444" },
      { name: "Ukkadam", status: "Smooth", count: "2,380 veh/h", color: "#10b981" }
    ],
    cameras: [
      { id: "CAM-01", name: "Gandhipuram - North", location: "Gandhipuram", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "Just now", feedFile: "v1.mp4" },
      { id: "CAM-02", name: "Gandhipuram - South", location: "Gandhipuram", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "Just now", feedFile: "v2.mp4" },
      { id: "CAM-03", name: "Avinashi - East", location: "Avinashi Road", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "1 min ago", feedFile: "v3.mp4" },
      { id: "CAM-04", name: "Avinashi - West", location: "Avinashi Road", status: "Offline", stream: "RTSP", resolution: "1920x1080", lastActive: "5 mins ago", feedFile: "v4.mp4" },
      { id: "CAM-05", name: "Peelamedu - North", location: "Peelamedu", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "Just now", feedFile: "v5.mp4" },
      { id: "CAM-06", name: "Peelamedu - South", location: "Peelamedu", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "Just now", feedFile: "v6.mp4" },
      { id: "CAM-07", name: "Tiruppur - Kuppuchipalayam Live", location: "Tiruppur", status: "Online", stream: "HLS Live (1080p)", resolution: "1920x1080", lastActive: "Live Now", feedFile: "https://stream.aqi.in/live/03880002000614d3dbef.m3u8" },
      { id: "CAM-08", name: "UK Street Surveillance CCTV", location: "Live Stream", status: "Online", stream: "MJPEG Live", resolution: "960x594", lastActive: "Live Now", feedFile: "https://view.custardlev.uk/video_feed" }
    ]
  },
  Chennai: {
    name: "Chennai",
    tagline: "Greater Chennai Traffic Police (GCTP) • Mega City ITMS",
    weather: "31°C Humid / Sea Breeze",
    skylineTitle: "Bay of Bengal Coastal Corridor",
    intersections: [
      { name: "Kathipara", status: "High", count: "6,820 veh/h", color: "#ef4444" },
      { name: "Anna Salai (Gemini)", status: "High", count: "5,940 veh/h", color: "#ef4444" },
      { name: "OMR (Sholinganallur)", status: "Moderate", count: "4,650 veh/h", color: "#f59e0b" },
      { name: "Koyambedu CMBT", status: "High", count: "5,810 veh/h", color: "#ef4444" },
      { name: "Madhya Kailash", status: "Moderate", count: "3,980 veh/h", color: "#f59e0b" },
      { name: "T. Nagar (Panagal)", status: "Smooth", count: "2,760 veh/h", color: "#10b981" }
    ],
    cameras: [
      { id: "CAM-CH-01", name: "Kathipara - North Arm", location: "Kathipara", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "Just now", feedFile: "v7.mp4" },
      { id: "CAM-CH-02", name: "Anna Salai - Gemini Flyover", location: "Anna Salai", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "Just now", feedFile: "v8.mp4" },
      { id: "CAM-CH-03", name: "OMR Expressway Toll Plaza", location: "OMR Expressway", status: "Online", stream: "RTSP", resolution: "1920x1080", lastActive: "2 mins ago", feedFile: "v9.mp4" }
    ]
  }
};

// Seed Administrators List for Master Admin Access Control
const INITIAL_ADMINS = [
  {
    id: 1,
    name: "Dharshana B",
    rank: "Sub-Inspector of Police (SI)",
    badge_id: "TN-CBE-TR-1048",
    email: "dharshana.si@itms.gov.in",
    role: "Authorized e-Challan Reviewer & Lead Admin",
    city: "Coimbatore",
    zone: "Coimbatore East",
    station: "Peelamedu Traffic Enforcement Wing",
    assigned_cameras: "Nodes v1, v2, v5, v7, Live Feed 01",
    status: "Active / On-Duty",
    contact_number: "+91 94454 88100",
    last_login: "Today, 10:14 AM"
  },
  {
    id: 2,
    name: "M. Karthikeyan",
    rank: "Traffic Inspector (TI)",
    badge_id: "TN-CBE-INS-512",
    email: "karthikeyan.ti@itms.gov.in",
    role: "Corridor Enforcement Chief",
    city: "Coimbatore",
    zone: "Coimbatore East",
    station: "Gandhipuram Traffic Police Station",
    assigned_cameras: "Avinashi Road & Gandhipuram Central",
    status: "Active / On-Duty",
    contact_number: "+91 94454 88105",
    last_login: "Yesterday, 04:30 PM"
  },
  {
    id: 3,
    name: "K. Saravanakumar, IPS",
    rank: "Deputy Commissioner of Police (DCP)",
    badge_id: "TN-CBE-DCP-102",
    email: "saravanakumar.dcp@itms.gov.in",
    role: "Zonal Traffic Commander",
    city: "Coimbatore",
    zone: "Coimbatore Traffic Zone (East & West)",
    station: "Traffic Control Room, Old Flyover",
    assigned_cameras: "Nodes v1 - v14",
    status: "Active / On-Duty",
    contact_number: "+91 422 230 3344",
    last_login: "Today, 08:45 AM"
  },
  {
    id: 4,
    name: "V. Balakrishnan, IPS",
    rank: "Commissioner of Police (CoP)",
    badge_id: "TN-CBE-COP-002",
    email: "balakrishnan.cop@itms.gov.in",
    role: "City Police Commissioner",
    city: "Coimbatore",
    zone: "Coimbatore City Commissionerate",
    station: "City Police Commissioner Office, Huzur Rd",
    assigned_cameras: "All 12 Coimbatore Corridor Nodes",
    status: "Active / City Command",
    contact_number: "+91 422 230 0250",
    last_login: "Oct 29, 02:15 PM"
  }
];

// Clean Geometric SVG Logo Brand Component (Zero Emojis!)
function BrandLogo({ size = 38, showText = true, subtitle = "Intelligent Traffic Management System", isLight = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill={isLight ? "#0f172a" : "#090d16"} />
        <rect x="1" y="1" width="46" height="46" rx="11" stroke={isLight ? "rgba(255, 255, 255, 0.2)" : "rgba(56, 189, 248, 0.25)"} strokeWidth="1.5" />
        {/* Concentric radar rings */}
        <circle cx="24" cy="24" r="16" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="24" cy="24" r="10" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />
        {/* Optical Sensor Aperture */}
        <path d="M24 10V16M24 32V38M10 24H16M32 24H38" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        {/* Three Traffic Signal Optic nodes */}
        <circle cx="24" cy="18" r="2.5" fill="#ef4444" />
        <circle cx="24" cy="24" r="2.5" fill="#f59e0b" />
        <circle cx="24" cy="30" r="2.5" fill="#10b981" />
      </svg>
      {showText && (
        <div>
          <div style={{ fontWeight: 800, fontSize: '18px', color: isLight ? '#0f172a' : 'var(--text-primary)', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
            TrafficSense AI
          </div>
          <div style={{ fontSize: '10.5px', color: isLight ? '#64748b' : 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.2px' }}>
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
}


// Full Requirements Checklist Data (100% Implemented)

export default function App() {

  // ==========================================
  // Authentication & Session State
  // ==========================================
  const [currentUser, setCurrentUser] = useState({
    role: "master",
    name: "Shri Shankar Jiwal, IPS",
    rank: "Director General of Police (DGP / State Master)",
    badge_id: "TN-HQ-DGP-001",
    email: "master@itms.gov.in",
    jurisdiction: "Statewide Tamil Nadu ITMS Command"
  });
  const [loginRole, setLoginRole] = useState("master");
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // Master Admin User Management State
  const [adminUsers, setAdminUsers] = useState(INITIAL_ADMINS);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: "",
    rank: "Sub-Inspector of Police (SI)",
    badge_id: "",
    email: "",
    role: "Authorized e-Challan Reviewer",
    city: "Coimbatore",
    zone: "Coimbatore East",
    station: "Peelamedu Traffic Enforcement Wing",
    assigned_cameras: "Nodes v1, v2",
    password: ""
  });
  const [adminSearch, setAdminSearch] = useState("");

  // ==========================================
  // Core ITMS Application State
  // ==========================================
  const [selectedCity, setSelectedCity] = useState("Coimbatore");
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [operatingMode, setOperatingMode] = useState("live"); // "live" | "footage"
  const [feedToast, setFeedToast] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);

  // Live Stream State (Mode 1)
  const [liveStatus, setLiveStatus] = useState({
    active: false,
    url: null,
    fps: 0,
    latency_ms: 0
  });
  const [customStreamUrl, setCustomStreamUrl] = useState("");
  const [isConnectingLive, setIsConnectingLive] = useState(false);

  // Recorded Footage State (Mode 2)
  const [availableFeeds, setAvailableFeeds] = useState([]);
  const [activeFeedId, setActiveFeedId] = useState("v1.mp4");
  const [isUploading, setIsUploading] = useState(false);
  const [footageLoop, setFootageLoop] = useState(true);
  const [videoFeedKey, setVideoFeedKey] = useState(Date.now());
  const [footageStatus, setFootageStatus] = useState({
    completed: false,
    current_frame: 0,
    total_frames: 0,
    progress_pct: 0,
    is_paused: false,
    current_source: "",
    mode: "Footage Upload Analysis"
  });
  const fileInputRef = useRef(null);

  // Telemetry, ANPR & Violations
  const [telemetry, setTelemetry] = useState({
    total_vehicles: 0,
    congestion_index: 0,
    signal_state: {
      signals: { 1: "GREEN", 2: "RED", 3: "RED", 4: "RED" },
      active_green_lane: 1,
      phase_state: "GREEN",
      remaining_seconds: 28,
      emergency_override: false
    },
    vehicle_census: {
      cars: 0,
      two_wheelers: 0,
      auto_rickshaws: 0,
      buses: 0,
      trucks: 0,
      pedestrians: 0,
      children: 0
    }
  });
  const [liveViolations, setLiveViolations] = useState([]);
  const [capturedPlates, setCapturedPlates] = useState([]);
  const [footageReport, setFootageReport] = useState(null);
  const [hourlyReports, setHourlyReports] = useState([]);
  const [activeReportSection, setActiveReportSection] = useState("all");
  const [isGeneratingHourlyLog, setIsGeneratingHourlyLog] = useState(false);

  // Police Officers Roster (Database-backed)
  const [policeOfficers, setPoliceOfficers] = useState([]);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [officerMappingToast, setOfficerMappingToast] = useState("");

  // Settings State (All 9 sections)
  const [settingsTab, setSettingsTab] = useState("General");
  const [settingsCity, setSettingsCity] = useState("Coimbatore");
  const [timezone, setTimezone] = useState("Asia/Kolkata (GMT+5:30)");
  const [activeModel, setActiveModel] = useState("yolov8m.pt");
  const [availableModels, setAvailableModels] = useState([]);
  const [modelSwitching, setModelSwitching] = useState(false);
  const [systemOverview, setSystemOverview] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [vacuumStatus, setVacuumStatus] = useState("");
  const [aiConfig, setAiConfig] = useState({
    conf_threshold: 0.28,
    iou_threshold: 0.45,
    blur_threshold: 65.0,
    speed_limit_car: 50.0,
    speed_limit_truck: 40.0
  });
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 587,
    sender_email: "",
    app_password: "",
    use_tls: true,
    control_center_email: "control.center@itms.gov.in",
    division_inspector_email: "inspector.div1@itms.gov.in",
    traffic_head_email: "sp.traffic@itms.gov.in"
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);
  const [smtpSaveToast, setSmtpSaveToast] = useState(false);
  const [automationConfig, setAutomationConfig] = useState({
    interval_seconds: 3600,
    automation_enabled: true
  });
  const [automationSaveToast, setAutomationSaveToast] = useState(false);

  // ==========================================
  // Real-Time Clock
  // ==========================================
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
      setCurrentTime(now.toLocaleString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // Strict Email Validation Helper
  // ==========================================
  const handleEmailChange = (val) => {
    // Force lowercase
    const lower = val.toLowerCase();
    setLoginEmail(lower);

    if (!lower) {
      setEmailError("Official email address is required.");
      return;
    }
    if (/[A-Z]/.test(val)) {
      setEmailError("Uppercase letters are not allowed in email address.");
      return;
    }
    if (!lower.includes("@")) {
      setEmailError("Email must contain '@' symbol.");
      return;
    }
    const parts = lower.split("@");
    if (parts.length !== 2 || !parts[1]) {
      setEmailError("Enter the domain portion after '@' (e.g., itms.gov.in).");
      return;
    }
    const domain = parts[1];
    if (!domain.includes(".")) {
      setEmailError("Domain must include an extension like .gov.in, .in, or .com.");
      return;
    }
    const ext = domain.split(".").pop();
    if (!ext || ext.length < 2) {
      setEmailError("Domain must end with a valid extension (e.g. .in, .gov.in, .com).");
      return;
    }
    setEmailError("");
  };

  // ==========================================
  // reCAPTCHA Checkbox Handler
  // ==========================================
  const handleCaptchaClick = () => {
    if (captchaChecked || captchaLoading) return;
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaChecked(true);
    }, 950);
  };

  // ==========================================
  // Automated Role-Based Access Control (RBAC)
  // Derived strictly via Email Validation (No manual toggle!)
  // ==========================================
  const detectRoleFromEmail = (email) => {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    
    // Master accounts: master@itms.gov.in, dgp@..., directorate@...
    if (clean === "master@itms.gov.in" || clean.startsWith("master") || clean.startsWith("dgp") || clean.includes("directorate")) {
      return {
        role: "master",
        label: "Master Directorate Command",
        sublabel: "State DGP Master Clearance • Full Administrative Control",
        badgeColor: "#4338ca",
        badgeBg: "#eef2ff",
        badgeBorder: "#c7d2fe",
        user: {
          role: "master",
          name: "Shri Shankar Jiwal, IPS",
          rank: "Director General of Police (DGP / State Master)",
          badge_id: "TN-HQ-DGP-001",
          email: clean,
          jurisdiction: "Statewide Tamil Nadu ITMS Command"
        }
      };
    }
    
    // Admin list check
    const matchedAdmin = adminUsers.find(a => a.email.toLowerCase() === clean);
    if (matchedAdmin) {
      return {
        role: "admin",
        label: `Enforcement Admin • ${matchedAdmin.name}`,
        sublabel: `${matchedAdmin.rank} • ${matchedAdmin.city} (${matchedAdmin.zone})`,
        badgeColor: "#0284c7",
        badgeBg: "#f0f9ff",
        badgeBorder: "#bae6fd",
        user: {
          role: "admin",
          name: matchedAdmin.name,
          rank: matchedAdmin.rank,
          badge_id: matchedAdmin.badge_id,
          email: clean,
          jurisdiction: `${matchedAdmin.city} (${matchedAdmin.zone})`
        }
      };
    }
    
    // Standard Enforcement Admin default
    return {
      role: "admin",
      label: "Enforcement Admin • Field Sub-Inspector",
      sublabel: "Sub-Inspector Dharshana B • Coimbatore East Division",
      badgeColor: "#059669",
      badgeBg: "#ecfdf5",
      badgeBorder: "#a7f3d0",
      user: {
        role: "admin",
        name: "Dharshana B",
        rank: "Sub-Inspector of Police (SI)",
        badge_id: "TN-CBE-TR-1048",
        email: clean,
        jurisdiction: "Coimbatore East Sub-Division"
      }
    };
  };

  const handleLoginSubmit = (e) => {
    e?.preventDefault();
    setLoginError("");

    if (!loginEmail.trim()) {
      setLoginError("Please enter your official departmental email.");
      return;
    }
    if (emailError) {
      setLoginError(emailError);
      return;
    }
    if (!loginPassword) {
      setLoginError("Please enter your security access key / password.");
      return;
    }
    if (!captchaChecked) {
      setLoginError("Please complete the reCAPTCHA security verification.");
      return;
    }

    const detected = detectRoleFromEmail(loginEmail);
    if (detected?.role === "master") {
      setCurrentUser(detected.user);
      setActiveTab("Master Admin Control");
    } else if (detected) {
      setCurrentUser(detected.user);
      setActiveTab("Dashboard");
    } else {
      setLoginError("Unable to authenticate role for this email address.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginPassword("");
    setCaptchaChecked(false);
    setLoginError("");
    setActiveTab("Dashboard");
  };

  // Demo fill shortcuts
  const fillMasterDemo = () => {
    setLoginRole("master");
    handleEmailChange("master@itms.gov.in");
    setLoginPassword("Master@2026");
    setCaptchaChecked(true);
    setLoginError("");
  };

  const fillAdminDemo = () => {
    setLoginRole("admin");
    handleEmailChange("dharshana.si@itms.gov.in");
    setLoginPassword("Admin@2026");
    setCaptchaChecked(true);
    setLoginError("");
  };

  // ==========================================
  // Master Admin User Management Actions
  // ==========================================
  const handleCreateAdmin = (e) => {
    e.preventDefault();
    if (!newAdminData.name || !newAdminData.email || !newAdminData.badge_id) {
      alert("Please fill all required administrator fields.");
      return;
    }
    const newAdmin = {
      id: Date.now(),
      name: newAdminData.name,
      rank: newAdminData.rank,
      badge_id: newAdminData.badge_id,
      email: newAdminData.email.toLowerCase(),
      role: newAdminData.role,
      city: newAdminData.city,
      zone: newAdminData.zone,
      station: newAdminData.station,
      assigned_cameras: newAdminData.assigned_cameras,
      status: "Active / On-Duty",
      contact_number: "+91 94454 00100",
      last_login: "Never (New Account)"
    };
    setAdminUsers([newAdmin, ...adminUsers]);
    setShowAddAdminModal(false);
    setNewAdminData({
      name: "",
      rank: "Sub-Inspector of Police (SI)",
      badge_id: "",
      email: "",
      role: "Authorized e-Challan Reviewer",
      city: "Coimbatore",
      zone: "Coimbatore East",
      station: "Peelamedu Traffic Enforcement Wing",
      assigned_cameras: "Nodes v1, v2",
      password: ""
    });
    setFeedToast(`New Admin Officer ${newAdmin.name} (${newAdmin.badge_id}) created successfully.`);
    setTimeout(() => setFeedToast(""), 4000);
  };

  const handleDeleteAdmin = (id) => {
    if (confirm("Are you sure you want to deactivate and remove this administrator?")) {
      setAdminUsers(adminUsers.filter(a => a.id !== id));
      setFeedToast("Administrator deactivated from State ITMS grid.");
      setTimeout(() => setFeedToast(""), 3000);
    }
  };

  const handleToggleAdminStatus = (id) => {
    setAdminUsers(adminUsers.map(a => {
      if (a.id === id) {
        const nextStatus = a.status.includes("Active") ? "Inactive / Suspended" : "Active / On-Duty";
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  // ==========================================
  // Backend Data Fetching & Sync
  // ==========================================
  const fetchPoliceOfficers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/police/officers`);
      if (res.ok) {
        const data = await res.json();
        setPoliceOfficers(data || []);
      }
    } catch (e) {
      console.error("Failed to load police officers", e);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/live/status`);
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data);
      }
    } catch (e) {}
  };

  const fetchFootageStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/footage/status`);
      if (res.ok) {
        const data = await res.json();
        setFootageStatus(data);
      }
    } catch (e) {}
  };

  const fetchLiveViolations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/violations?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLiveViolations(data || []);
      }
    } catch (e) {}
  };

  const fetchCapturedPlates = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/anpr/captured-plates?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setCapturedPlates(data.plates || []);
      }
    } catch (e) {}
  };

  const fetchFootageAuditReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/footage-audit`);
      if (res.ok) {
        const data = await res.json();
        setFootageReport(data);
      }
    } catch (e) {}
  };

  const fetchAvailableFeeds = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/feed/list`);
      if (res.ok) {
        const data = await res.json();
        setAvailableFeeds(data.available_feeds || []);
        if (data.active_source) setActiveFeedId(data.active_source);
      }
    } catch (e) {}
  };

  const fetchSettingsOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/overview`);
      if (res.ok) {
        const data = await res.json();
        setSystemOverview(data);
      }
    } catch (e) {}
  };

  const fetchSystemLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/logs?limit=40`);
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data || []);
      }
    } catch (e) {}
  };

  const fetchAvailableModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/model/available`);
      if (res.ok) {
        const data = await res.json();
        setActiveModel(data.active_model);
        setAvailableModels(data.models || []);
      }
    } catch (e) {}
  };

  const fetchHourlyReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports/hourly?limit=24`);
      if (res.ok) {
        const data = await res.json();
        setHourlyReports(data || []);
      }
    } catch (e) {}
  };

  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/smtp`);
      if (res.ok) {
        const data = await res.json();
        setSmtpConfig(prev => ({ ...prev, ...data }));
      }
    } catch (e) {}
  };

  const fetchAutomationConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/automation/config`);
      if (res.ok) {
        const data = await res.json();
        setAutomationConfig(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAvailableFeeds();
    fetchLiveViolations();
    fetchCapturedPlates();
    fetchFootageStatus();
    fetchLiveStatus();
    fetchPoliceOfficers();
    fetchAvailableModels();
    fetchSettingsOverview();
    fetchSystemLogs();
    fetchHourlyReports();
    fetchSmtpConfig();
    fetchAutomationConfig();
  }, []);

  // Mode 2 Periodic Polling when Footage Mode is Active
  useEffect(() => {
    if (operatingMode === "footage") {
      const interval = setInterval(() => {
        fetchFootageStatus();
        fetchCapturedPlates();
        fetchFootageAuditReport();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [operatingMode]);

  // WebSocket Live Telemetry Stream
  useEffect(() => {
    let ws = null;
    let isMounted = true;
    let timer = null;
    const connect = () => {
      if (!isMounted) return;
      try {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => { if (isMounted) setWsConnected(true); };
        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            setTelemetry(prev => ({
              ...prev,
              ...data,
              total_vehicles: data.total_vehicles !== undefined ? data.total_vehicles : prev.total_vehicles,
              signal_state: data.signal_state || prev.signal_state,
              vehicle_census: data.vehicle_census || prev.vehicle_census
            }));
            if (data.new_violations && data.new_violations.length > 0) {
              fetchLiveViolations();
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          timer = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (e) {}
    };
    connect();
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }, []);

  // ==========================================
  // Mode 1: Live Stream Actions
  // ==========================================
  const handleConnectLiveStream = async (url) => {
    const targetUrl = url || customStreamUrl;
    if (!targetUrl.trim()) {
      alert("Please enter a valid RTSP, HLS (.m3u8), or MJPEG stream URL.");
      return;
    }
    try {
      setIsConnectingLive(true);
      const res = await fetch(`${API_BASE}/api/live/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setLiveStatus({ active: true, url: targetUrl.trim(), fps: 28.5, latency_ms: 120 });
        setFeedToast(`Connected to Live Surveillance Stream: ${targetUrl.trim()}`);
        setTimeout(() => setFeedToast(""), 4000);
      } else {
        alert(`Stream Connection Error: ${data.detail || "Unable to connect to camera."}`);
      }
    } catch (e) {
      alert("Network error connecting to live stream.");
    } finally {
      setIsConnectingLive(false);
    }
  };

  const handleDisconnectLiveStream = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/live/disconnect`, { method: "POST" });
      if (res.ok) {
        setLiveStatus({ active: false, url: null, fps: 0, latency_ms: 0 });
        setFeedToast("Live stream disconnected. Returned to Standby Radar Monitor.");
        setTimeout(() => setFeedToast(""), 4000);
      }
    } catch (e) {}
  };

  // ==========================================
  // Mode 2: Footage Actions (1-Time Single Pass)
  // ==========================================
  const handleStartFootageAnalysis = async (filename) => {
    try {
      const res = await fetch(`${API_BASE}/api/footage/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        setActiveFeedId(filename);
        setVideoFeedKey(Date.now());
        setFeedToast(`Started Live Frame-by-Frame YOLO Analysis on ${filename}`);
        setTimeout(() => setFeedToast(""), 4000);
        await fetchFootageStatus();
        await fetchCapturedPlates();
        await fetchFootageAuditReport();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePauseFootage = async () => {
    try {
      await fetch(`${API_BASE}/api/footage/pause`, { method: "POST" });
      await fetchFootageStatus();
    } catch (e) {}
  };

  const handleResumeFootage = async () => {
    try {
      await fetch(`${API_BASE}/api/footage/resume`, { method: "POST" });
      await fetchFootageStatus();
    } catch (e) {}
  };

  const handleRemoveVideo = async (filename) => {
    const target = filename || footageStatus.current_source || activeFeedId;
    if (!target) {
      alert("No video selected to remove.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${target}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/feed/${encodeURIComponent(target)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFeedToast(`Removed "${target}". You can now upload or select a new video.`);
        setTimeout(() => setFeedToast(""), 4000);
        if (activeFeedId === target) setActiveFeedId("");
        setVideoFeedKey(Date.now());
        await fetchAvailableFeeds();
        await fetchFootageStatus();
      } else {
        alert("Failed to remove video.");
      }
    } catch (e) {
      alert("Error removing video.");
    }
  };

  const handleRestartFootage = async () => {
    try {
      await fetch(`${API_BASE}/api/footage/restart`, { method: "POST" });
      setVideoFeedKey(Date.now());
      await fetchFootageStatus();
    } catch (e) {}
  };

  const handleToggleLoop = async () => {
    const nextLoop = !footageLoop;
    setFootageLoop(nextLoop);
    try {
      await fetch(`${API_BASE}/api/footage/loop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loop: nextLoop })
      });
      await fetchFootageStatus();
    } catch (e) {}
  };

  const handleUploadCCTV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/feed/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        setFeedToast(`Uploaded and Initiated Live Analysis: ${file.name}`);
        setTimeout(() => setFeedToast(""), 4000);
        await fetchAvailableFeeds();
        setActiveFeedId(file.name);
        setVideoFeedKey(Date.now());
        await fetchFootageStatus();
      } else {
        alert("Upload failed. Verify MP4 video format.");
      }
    } catch (e) {
      alert("Error uploading video file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSwitchOperatingMode = async (mode) => {
    setOperatingMode(mode);
    try {
      await fetch(`${API_BASE}/api/mode/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      if (mode === "live") {
        setActiveTab("Dashboard");
        fetchLiveStatus();
      } else {
        setActiveTab("Footage Repository");
        fetchFootageStatus();
      }
    } catch (e) {}
  };

  // ==========================================
  // Violation & Officer Actions
  // ==========================================
  const handleVerifyViolation = async (violationId, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/violations/${violationId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: `Official officer action ${status} stamped by ${currentUser?.name || "Authorized Officer"}.`
        })
      });
      if (res.ok) {
        setFeedToast(`Violation #V-${violationId} verified as "${status}" under Indian MV Act`);
        setTimeout(() => setFeedToast(""), 4000);
        fetchLiveViolations();
        if (operatingMode === "footage") fetchFootageAuditReport();
      }
    } catch (e) {}
  };

  const handleUpdateOfficerCameras = async (badgeId, newCameras) => {
    try {
      const res = await fetch(`${API_BASE}/api/police/officers/${badgeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_cameras: newCameras })
      });
      if (res.ok) {
        setOfficerMappingToast(`Jurisdictional CCTV assignment updated for officer ${badgeId}`);
        setTimeout(() => setOfficerMappingToast(""), 4000);
        fetchPoliceOfficers();
        setEditingOfficer(null);
      }
    } catch (e) {}
  };

  const handleVacuumDatabase = async () => {
    try {
      setVacuumStatus("Optimizing database...");
      const res = await fetch(`${API_BASE}/api/settings/database/vacuum`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setVacuumStatus(`Optimization Complete: Reclaimed ${data.message}`);
        fetchSettingsOverview();
      } else {
        setVacuumStatus("Database optimization failed.");
      }
    } catch (e) {
      setVacuumStatus("Network error during database vacuum.");
    }
  };

  const handleSelectModel = async (modelName) => {
    try {
      setModelSwitching(true);
      const res = await fetch(`${API_BASE}/api/model/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName })
      });
      if (res.ok) {
        setActiveModel(modelName);
        setFeedToast(`AI Detection Engine Upgraded to ${modelName}`);
        setTimeout(() => setFeedToast(""), 4000);
      }
    } catch (e) {} finally {
      setModelSwitching(false);
    }
  };

  const handleTriggerHourlyLog = async () => {
    try {
      setIsGeneratingHourlyLog(true);
      const res = await fetch(`${API_BASE}/api/reports/hourly/generate-now`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFeedToast(`Automated Traffic Audit Log Archived! Report #${data.report.id}`);
        setTimeout(() => setFeedToast(""), 4000);
        await fetchHourlyReports();
      }
    } catch (e) {} finally {
      setIsGeneratingHourlyLog(false);
    }
  };

  // Check if footage has been analyzed for progressive unlocking
  const hasFootageAnalyzed = Boolean(footageStatus && (footageStatus.current_frame > 0 || footageStatus.completed || footageReport));

  const city = CITY_DATA[selectedCity] || CITY_DATA.Coimbatore;

  // Direct Authentic ITMS Production Environment (No login barrier)

  // =========================================================================
  // 2. MASTER LOGIN DEDICATED ACCESS CONTROL PAGE
  // =========================================================================
  const renderMasterAdminPage = () => {
    const filteredAdmins = adminUsers.filter(a => 
      a.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.badge_id.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.city.toLowerCase().includes(adminSearch.toLowerCase())
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Master Command Authority Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #2e1065 0%, #1e1b4b 50%, #0f172a 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.3)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge" style={{ backgroundColor: '#7c3aed', color: '#ffffff', fontWeight: 800 }}>
                DIRECTORATE ACCESS CONTROL
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Master Authorization Tier: State Command
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '8px 0 4px 0', letterSpacing: '-0.3px' }}>
              Administrator User Management & Security Roster
            </h2>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, maxWidth: '640px' }}>
              Create, provision, configure, and monitor authorized police enforcement officers, sub-inspectors, and zonal traffic admins across Tamil Nadu ITMS grid nodes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="btn-primary"
              style={{
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <UserPlus size={16} /> Add New Admin Officer
            </button>
            <button
              onClick={() => setActiveTab("Dashboard")}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <Video size={16} /> Enter ITMS Surveillance Grid
            </button>
          </div>
        </div>

        {/* 4 State KPI Cards for Master */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Administrators</div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#7c3aed' }}>
              {adminUsers.filter(a => a.status.includes("Active")).length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total provisioned: {adminUsers.length} accounts
            </div>
          </div>
          <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Mapped Police Stations</div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#0284c7' }}>
              {new Set(adminUsers.map(a => a.station)).size}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Across Coimbatore & Chennai Zones
            </div>
          </div>
          <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Surveillance Camera Nodes</div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#10b981' }}>
              27 Clips + 2 Live Streams
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              100% Calibrated with YOLOv8 & OCR
            </div>
          </div>
          <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Security Compliance</div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#f59e0b' }}>
              100% Audited
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Indian Motor Vehicles Act Section 136A
            </div>
          </div>
        </div>

        {/* Administrators Roster Table */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Authorized Administrators Roster
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                All officers registered with e-Challan digital signing and jurisdictional surveillance authority.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search admin name, badge, email..."
                  className="select-field"
                  style={{ width: '100%', paddingLeft: '32px', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Officer Name & Rank</th>
                  <th>Badge ID</th>
                  <th>Departmental Email</th>
                  <th>Jurisdictional Station</th>
                  <th>Assigned CCTV Nodes</th>
                  <th>Status</th>
                  <th>Last Activity</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {admin.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                        {admin.rank}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>
                        {admin.badge_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                        <Mail size={13} color="#64748b" />
                        <code>{admin.email}</code>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {admin.station}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {admin.city} ({admin.zone})
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                        color: '#0f172a'
                      }}>
                        {admin.assigned_cameras}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleAdminStatus(admin.id)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          backgroundColor: admin.status.includes("Active") ? '#dcfce7' : '#fee2e2',
                          color: admin.status.includes("Active") ? '#166534' : '#991b1b'
                        }}
                        title="Click to toggle active/suspended status"
                      >
                        {admin.status}
                      </button>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {admin.last_login}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => {
                            const newCams = prompt(`Update assigned cameras for ${admin.name}:`, admin.assigned_cameras);
                            if (newCams) {
                              setAdminUsers(adminUsers.map(a => a.id === admin.id ? { ...a, assigned_cameras: newCams } : a));
                              setFeedToast(`Cameras updated for ${admin.name}`);
                              setTimeout(() => setFeedToast(""), 3000);
                            }
                          }}
                          className="btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                          title="Edit Permissions & Cameras"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            cursor: 'pointer'
                          }}
                          title="Revoke Admin Access"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal: Add New Admin User */}
        {showAddAdminModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} color="#7c3aed" />
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Provision New ITMS Administrator
                  </h3>
                </div>
                <button onClick={() => setShowAddAdminModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Officer Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newAdminData.name}
                      onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                      placeholder="e.g. S. Arunkumar"
                      className="select-field"
                      style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Official Rank *</label>
                    <select
                      value={newAdminData.rank}
                      onChange={(e) => setNewAdminData({ ...newAdminData, rank: e.target.value })}
                      className="select-field"
                      style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                    >
                      <option>Sub-Inspector of Police (SI)</option>
                      <option>Traffic Inspector (TI)</option>
                      <option>Assistant Commissioner of Police (ACP)</option>
                      <option>Deputy Commissioner of Police (DCP)</option>
                      <option>Head Constable (HC - Traffic)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Badge ID *</label>
                    <input
                      type="text"
                      required
                      value={newAdminData.badge_id}
                      onChange={(e) => setNewAdminData({ ...newAdminData, badge_id: e.target.value })}
                      placeholder="e.g. TN-CBE-TR-2089"
                      className="select-field"
                      style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Official Email (Lowercase) *</label>
                    <input
                      type="email"
                      required
                      value={newAdminData.email}
                      onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value.toLowerCase() })}
                      placeholder="arunkumar.si@itms.gov.in"
                      className="select-field"
                      style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>City / Jurisdiction *</label>
                    <select
                      value={newAdminData.city}
                      onChange={(e) => setNewAdminData({ ...newAdminData, city: e.target.value })}
                      className="select-field"
                      style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                    >
                      <option value="Coimbatore">Coimbatore</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Tiruppur">Tiruppur</option>
                      <option value="Salem">Salem</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Police Station / Wing</label>
                    <input
                      type="text"
                      value={newAdminData.station}
                      onChange={(e) => setNewAdminData({ ...newAdminData, station: e.target.value })}
                      placeholder="e.g. Gandhipuram Traffic PS"
                      className="select-field"
                      style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>Assigned CCTV Cameras</label>
                  <input
                    type="text"
                    value={newAdminData.assigned_cameras}
                    onChange={(e) => setNewAdminData({ ...newAdminData, assigned_cameras: e.target.value })}
                    placeholder="e.g. Nodes v1, v2, v3, Live Feed 01"
                    className="select-field"
                    style={{ width: '100%', marginTop: '4px', fontSize: '12.5px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowAddAdminModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}>
                    <CheckCircle2 size={15} /> Provision Admin Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  };

  // =========================================================================
  // 3. MAIN NAVIGATION TABS BUILDER
  // =========================================================================
  const liveNavItems = [
    { name: "Live Dashboard", id: "Dashboard", icon: Layers },
    { name: "Live Surveillance & Stream", id: "Live Monitoring", icon: Video },
    { name: "Live Violations Feed", id: "Violations", icon: AlertTriangle },
    { name: "Traffic Analytics", id: "Traffic Analytics", icon: Activity },
    { name: "Dynamic Signals", id: "Signal Control", icon: Radio },
    { name: "Jurisdictional Map", id: "Map View", icon: Map },
    { name: "Official Reports", id: "Reports", icon: FileText },
    { name: "Settings", id: "Settings", icon: Settings }
  ];

  const footageNavItems = [
    { name: "Upload & Repository Footage", id: "Footage Repository", icon: Upload },
    { name: "Vehicle & Pedestrian Census", id: "Traffic Analytics", icon: Activity },
    { name: "ANPR & Blurry Predictive OCR", id: "ANPR Ledger", icon: Camera },
    { name: "Violations Proof Ledger", id: "Violations", icon: AlertTriangle },
    { name: "Forensic Audit Report", id: "Reports", icon: FileText },
    { name: "Settings", id: "Settings", icon: Settings }
  ];

  if (currentUser?.role === "master") {
    liveNavItems.unshift({ name: "Master Admin Control", id: "Master Admin Control", icon: Key });
    footageNavItems.unshift({ name: "Master Admin Control", id: "Master Admin Control", icon: Key });
  }

  const currentNavItems = operatingMode === "live" ? liveNavItems : footageNavItems;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      
      {/* 1. Left Navigation Sidebar */}
      <aside style={{
        width: '272px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 50,
        flexShrink: 0
      }}>
        <div>
          {/* Brand Logo Lockup */}
          <div style={{ paddingLeft: '8px', marginBottom: '22px' }}>
            <BrandLogo size={36} subtitle="Intelligent Traffic Surveillance" />
          </div>

          {/* Quick City Switcher in Sidebar */}
          <div style={{
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            display: 'flex',
            gap: '4px',
            marginBottom: '18px'
          }}>
            <button
              onClick={() => setSelectedCity("Coimbatore")}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: selectedCity === "Coimbatore" ? '#ffffff' : 'transparent',
                color: selectedCity === "Coimbatore" ? '#0f172a' : '#64748b',
                boxShadow: selectedCity === "Coimbatore" ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <MapPin size={13} color="#0284c7" /> Coimbatore
            </button>
            <button
              onClick={() => setSelectedCity("Chennai")}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: selectedCity === "Chennai" ? '#ffffff' : 'transparent',
                color: selectedCity === "Chennai" ? '#0f172a' : '#64748b',
                boxShadow: selectedCity === "Chennai" ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <MapPin size={13} color="#0284c7" /> Chennai
            </button>
          </div>

          {/* Dual-Mode Selector in Sidebar */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '10px',
            borderRadius: '12px',
            marginBottom: '18px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
            border: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '2px', paddingRight: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Operational Mode
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: operatingMode === 'live' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(2, 132, 199, 0.25)',
                color: operatingMode === 'live' ? '#ef4444' : '#38bdf8'
              }}>
                {operatingMode === 'live' ? (liveStatus.active ? 'LIVE ACTIVE' : 'LIVE STANDBY') : 'FOOTAGE AUDIT'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                onClick={() => handleSwitchOperatingMode("live")}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  border: operatingMode === 'live' ? '1.5px solid #ef4444' : '1px solid #334155',
                  backgroundColor: operatingMode === 'live' ? '#dc2626' : '#1e293b',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Radio size={12} />
                Mode 1: Live
              </button>
              <button
                onClick={() => handleSwitchOperatingMode("footage")}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  border: operatingMode === 'footage' ? '1.5px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: operatingMode === 'footage' ? '#0284c7' : '#1e293b',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <Upload size={12} />
                Mode 2: Footage
              </button>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? 'var(--brand-green-light)' : 'transparent',
                    color: isActive ? 'var(--brand-green)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session Footer & Logout */}
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: currentUser?.role === 'master' ? '#7c3aed' : '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px'
            }}>
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.badge_id} • {currentUser?.role?.toUpperCase()}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (currentUser?.role === 'master') {
                setCurrentUser({
                  role: "admin",
                  name: "Dharshana B",
                  rank: "Sub-Inspector of Police (SI)",
                  badge_id: "TN-CBE-TR-1048",
                  email: "dharshana.si@itms.gov.in",
                  jurisdiction: "Coimbatore East Sub-Division"
                });
                setActiveTab("Dashboard");
                setFeedToast("Active Session: Enforcement Admin (Sub-Inspector Dharshana B)");
              } else {
                setCurrentUser({
                  role: "master",
                  name: "Shri Shankar Jiwal, IPS",
                  rank: "Director General of Police (DGP / State Master)",
                  badge_id: "TN-HQ-DGP-001",
                  email: "master@itms.gov.in",
                  jurisdiction: "Statewide Tamil Nadu ITMS Command"
                });
                setActiveTab("Master Admin Control");
                setFeedToast("Active Session: Master Directorate Command (DGP Shri Shankar Jiwal, IPS)");
              }
            }}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: currentUser?.role === 'master' ? '#4338ca' : '#0369a1',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={13} /> Switch Role: {currentUser?.role === 'master' ? 'Enforcement Admin (SI)' : 'Master Command (DGP)'}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        
        {/* Global Toast Notification */}
        {feedToast && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#065f46',
            marginBottom: '18px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={16} color="#10b981" />
              <span>{feedToast}</span>
            </div>
            <button onClick={() => setFeedToast("")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN: MASTER ADMIN CONTROL (Visible to Master Login)                    */}
        {/* ========================================================================= */}
        {activeTab === "Master Admin Control" && renderMasterAdminPage()}

        {/* ========================================================================= */}
        {/* SCREEN: DASHBOARD                                                         */}
        {/* ========================================================================= */}
        {activeTab === "Dashboard" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {city.name} Traffic Intelligence Command Center
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {city.tagline} • Operating in {operatingMode === 'live' ? 'Mode 1: Live Surveillance Grid' : 'Mode 2: Recorded Footage Forensic Audit'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge ${operatingMode === 'live' ? (liveStatus.active ? 'badge-red' : 'badge-amber') : 'badge-blue'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: operatingMode === 'live' ? (liveStatus.active ? '#ef4444' : '#f59e0b') : '#0284c7' }}></span>
                  {operatingMode === 'live' ? (liveStatus.active ? 'Live Stream Online' : 'Live Standby Radar') : 'Footage Audit Mode'}
                </span>
                <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                  Tamil Nadu State ITMS Grid Online
                </span>
                <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> Indian MV Act Compliant
                </span>
              </div>
            </div>

            {/* Live Standby Alert in Live Mode if not connected */}
            {operatingMode === 'live' && !liveStatus.active && (
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Radio size={24} color="#dc2626" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#991b1b' }}>
                      Live Surveillance Standby Active
                    </div>
                    <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                      No remote camera is currently connected. Connect an RTSP or HLS stream in the Live Surveillance tab to start real-time analytics.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("Live Monitoring")}
                  className="btn-primary"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', fontSize: '12px', padding: '8px 16px' }}
                >
                  <ExternalLink size={14} /> Open Live Stream Connector
                </button>
              </div>
            )}

            {/* 4 Metric KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Vehicles Tracked</div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#0f172a' }}>
                  {operatingMode === 'live' ? (liveStatus.active ? (telemetry.total_vehicles || 0) : 0) : (((telemetry.vehicle_census?.cars ?? telemetry.vehicle_census?.car ?? 0) + (telemetry.vehicle_census?.two_wheelers ?? telemetry.vehicle_census?.two_wheeler ?? 0) + (telemetry.vehicle_census?.auto_rickshaws ?? telemetry.vehicle_census?.auto_rickshaw ?? 0) + (telemetry.vehicle_census?.buses ?? telemetry.vehicle_census?.bus ?? 0) + (telemetry.vehicle_census?.trucks ?? telemetry.vehicle_census?.truck ?? 0)) || (telemetry.total_vehicles || 0))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {operatingMode === 'live' ? 'Across active surveillance nodes' : 'Unique vehicles registered in clip'}
                </div>
              </div>

              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Corridor Congestion Index</div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#10b981' }}>
                  {operatingMode === 'live' ? (liveStatus.active ? `${telemetry.congestion_index}%` : "0%") : `${telemetry.congestion_index}%`}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Dynamic density calculation
                </div>
              </div>

              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Statutory Violations Filed</div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#dc2626' }}>
                  {liveViolations.length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Mapped to Indian MV Act 1988/2019
                </div>
              </div>

              <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>License Plates Scanned (ANPR)</div>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#d97706' }}>
                  {capturedPlates.length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  EasyOCR + Laplacian Blur Engine
                </div>
              </div>
            </div>

            {/* Video Viewport & Signals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
              
              {/* Primary Video Feed */}
              <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={16} color="#0284c7" />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                      {operatingMode === 'live' ? (liveStatus.active ? 'Live Video Surveillance Stream' : 'Live Standby Radar Sweep') : `Footage Analysis: ${activeFeedId}`}
                    </span>
                  </div>
                  <span className="badge" style={{ backgroundColor: '#0f172a', color: '#38bdf8', fontSize: '10.5px' }}>
                    AI Model: {activeModel}
                  </span>
                </div>

                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#070b14'
                }}>
                  <img
                    src={`${API_BASE}/api/video_feed`}
                    alt="Traffic AI Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              </div>

              {/* Dynamic Signal State Card */}
              <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Radio size={16} color="#059669" />
                    <span style={{ fontSize: '13.5px', fontWeight: 800 }}>Adaptive Signal Controller</span>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: '10px' }}>Phase Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[1, 2, 3, 4].map(lane => {
                    const isGreen = telemetry.signal_state?.active_green_lane === lane;
                    return (
                      <div
                        key={lane}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: isGreen ? '#ecfdf5' : '#f8fafc',
                          border: isGreen ? '1.5px solid #10b981' : '1px solid var(--border-light)',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>LANE {lane}</div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 900,
                          marginTop: '4px',
                          color: isGreen ? '#059669' : '#dc2626'
                        }}>
                          {isGreen ? 'GREEN' : 'RED'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f1f5f9', fontSize: '11.5px', color: '#475569' }}>
                  Remaining Phase: <strong>{telemetry.signal_state?.remaining_seconds || 20}s</strong> • Adjusts dynamically based on lane queue density.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN: MODE 1 - LIVE SURVEILLANCE & STREAM CONNECTOR                     */}
        {/* ========================================================================= */}
        {activeTab === "Live Monitoring" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Live Surveillance Stream Connector
                    </h2>
                    <span className={`badge ${liveStatus.active ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '11px' }}>
                      {liveStatus.active ? 'Live Stream Active' : 'Standby Mode'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Connect verified municipal IP camera streams via RTSP, HLS (.m3u8), or MJPEG for continuous live AI queue tracking.
                  </p>
                </div>

                {liveStatus.active && (
                  <button
                    onClick={handleDisconnectLiveStream}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #ef4444',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <X size={14} /> Disconnect Live Stream
                  </button>
                )}
              </div>

              {/* Stream URL Input Box */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={customStreamUrl}
                    onChange={(e) => setCustomStreamUrl(e.target.value)}
                    placeholder="Enter live camera URL (e.g. RTSP or https://stream.aqi.in/live/....m3u8)..."
                    className="select-field"
                    style={{ flex: 1, fontSize: '12.5px', backgroundColor: '#ffffff', borderColor: '#f87171' }}
                  />
                  <button
                    onClick={() => handleConnectLiveStream(customStreamUrl)}
                    disabled={isConnectingLive}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '8px 20px', backgroundColor: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> {isConnectingLive ? "Connecting..." : "Connect Live Stream"}
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#7f1d1d' }}>Verified Public Feeds:</span>
                  <button
                    onClick={() => {
                      setCustomStreamUrl("https://stream.aqi.in/live/03880002000614d3dbef.m3u8");
                      handleConnectLiveStream("https://stream.aqi.in/live/03880002000614d3dbef.m3u8");
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      border: '1px solid #f87171',
                      color: '#991b1b',
                      cursor: 'pointer'
                    }}
                  >
                    Tamil Nadu: Tiruppur Live CCTV (1080p)
                  </button>
                  <button
                    onClick={() => {
                      setCustomStreamUrl("https://view.custardlev.uk/video_feed");
                      handleConnectLiveStream("https://view.custardlev.uk/video_feed");
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#ffffff',
                      border: '1px solid #f87171',
                      color: '#991b1b',
                      cursor: 'pointer'
                    }}
                  >
                    UK Street Surveillance CCTV (MJPEG)
                  </button>
                </div>
              </div>

              {/* Main Live Stream Player */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                maxHeight: '520px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: '#070b14'
              }}>
                <img
                  src={`${API_BASE}/api/video_feed`}
                  alt="Live Surveillance Stream"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />

                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: liveStatus.active ? '#ef4444' : '#f59e0b',
                      display: 'inline-block'
                    }}></span>
                    {liveStatus.active ? 'LIVE SURVEILLANCE CONNECTED' : 'STANDBY RADAR SWEEP ACTIVE'}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN: MODE 2 - FOOTAGE REPOSITORY & UPLOAD TAB                          */}
        {/* ========================================================================= */}
        {activeTab === "Footage Repository" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header & Custom Upload */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Recorded Footage Repository & Forensic Upload
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Upload custom MP4 CCTV clips or choose from 27 authentic 4K Indian highway and arterial surveillance recordings.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadCCTV}
                    accept="video/mp4,video/x-m4v,video/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    disabled={isUploading}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '9px 18px' }}
                  >
                    <Upload size={14} /> {isUploading ? "Uploading..." : "Upload Custom Video"}
                  </button>
                </div>
              </div>

              {/* Live Video Surveillance & Detection Feed Player */}
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #1e293b',
                backgroundColor: '#070b14',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Player Toolbar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  backgroundColor: '#0f172a',
                  borderBottom: '1px solid #1e293b',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: footageStatus.is_paused ? '#f59e0b' : '#10b981',
                      boxShadow: `0 0 10px ${footageStatus.is_paused ? '#f59e0b' : '#10b981'}`
                    }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#f8fafc' }}>
                      Live Video Analysis Feed: {footageStatus.current_source || activeFeedId}
                    </span>
                    <span className="badge" style={{ backgroundColor: '#1e293b', color: '#38bdf8', fontSize: '11px', fontWeight: 700 }}>
                      YOLOv8 Real-time HUD
                    </span>
                  </div>

                  {/* Playback Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {footageStatus.is_paused ? (
                      <button
                        onClick={handleResumeFootage}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                      >
                        <Play size={13} /> Resume
                      </button>
                    ) : (
                      <button
                        onClick={handlePauseFootage}
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Pause size={13} /> Pause
                      </button>
                    )}
                    <button
                      onClick={handleRestartFootage}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      title="Replay from Beginning"
                    >
                      <RotateCcw size={13} /> Replay
                    </button>
                    <button
                      onClick={handleToggleLoop}
                      className={footageLoop ? "btn-primary" : "btn-secondary"}
                      style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      title="Toggle Continuous Loop"
                    >
                      <Repeat size={13} /> {footageLoop ? "Loop: ON" : "Loop: OFF"}
                    </button>
                    <button
                      onClick={() => handleRemoveVideo(footageStatus.current_source || activeFeedId)}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', borderColor: '#fca5a5' }}
                      title="Delete current video so you can upload a new one"
                    >
                      <Trash2 size={13} /> Remove Video
                    </button>
                    <button
                      onClick={() => setActiveTab("Traffic Analytics")}
                      className="btn-primary"
                      style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Activity size={13} /> View Vehicle Census
                    </button>
                    <button
                      onClick={() => setActiveTab("Reports")}
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <FileText size={13} /> View Audit Report
                    </button>
                  </div>
                </div>

                {/* Video Image Stream */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: '#070b14' }}>
                  <img
                    src={`${API_BASE}/api/video_feed?t=${videoFeedKey}`}
                    alt="Traffic AI Forensic Live Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>

                {/* Progress Bar & Frame Status */}
                <div style={{ padding: '12px 18px', backgroundColor: '#0f172a', borderTop: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', marginBottom: '8px' }}>
                    <span>Frame: <strong style={{ color: '#f8fafc' }}>{footageStatus.current_frame}</strong> / {footageStatus.total_frames}</span>
                    <span>Progress: <strong style={{ color: '#38bdf8' }}>{footageStatus.progress_pct}%</strong></span>
                    <span>Status: <strong style={{ color: footageStatus.is_paused ? '#f59e0b' : '#10b981' }}>{footageStatus.is_paused ? "Playback Paused (Click Resume to Play)" : "Live Video Surveillance Active (Continuous)"}</strong></span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${footageStatus.progress_pct}%`, height: '100%', backgroundColor: '#0284c7', transition: 'width 0.2s' }} />
                  </div>
                </div>
              </div>

              {/* Custom Uploaded Videos Section (if any) */}
              {availableFeeds.some(f => f.is_custom || (!f.filename?.startsWith('v') && f.type !== 'live_stream')) && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
                    Uploaded Custom CCTV Recordings
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    {availableFeeds
                      .filter(f => f.is_custom || (!f.filename?.startsWith('v') && f.type !== 'live_stream'))
                      .map((feed) => {
                        const isSelected = activeFeedId === feed.id || activeFeedId === feed.filename;
                        return (
                          <div
                            key={feed.id}
                            style={{
                              padding: '14px',
                              borderRadius: '10px',
                              backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                              border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-light)',
                              boxShadow: 'var(--shadow-sm)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7' }}>
                                  CUSTOM VIDEO
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                  {feed.size_mb} MB
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', wordBreak: 'break-all' }}>
                                {feed.filename || feed.name}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleStartFootageAnalysis(feed.filename)}
                                style={{
                                  flex: 1,
                                  padding: '7px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: isSelected ? '#0284c7' : '#0f172a',
                                  color: '#ffffff',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                              >
                                <Play size={12} /> {isSelected ? "Re-play & Analyze" : "Play & Analyze Live"}
                              </button>
                              <button
                                onClick={() => handleRemoveVideo(feed.filename)}
                                style={{
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #fee2e2',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  fontSize: '11.5px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Delete this video"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 27 4K Video Clips Grid */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: '#0f172a' }}>
                  27 Real 4K Indian CCTV Recordings Repository
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {availableFeeds
                    .filter(f => f.filename && (f.filename.startsWith('v') || f.filename.includes('indian') || f.filename.includes('madurai') || f.filename.includes('traffic')))
                    .map((feed) => {
                      const isSelected = activeFeedId === feed.id;
                      return (
                        <div
                          key={feed.id}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                            border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-light)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7' }}>
                                {feed.filename.toUpperCase()}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                3840x2160 • {feed.size_mb} MB
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                              {feed.name}
                            </div>
                          </div>

                          <button
                            onClick={() => handleStartFootageAnalysis(feed.filename)}
                            style={{
                              padding: '7px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: isSelected ? '#0284c7' : '#0f172a',
                              color: '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Play size={12} /> {isSelected ? "Re-run Analysis" : "Select & Analyze"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN: VEHICLE & PEDESTRIAN CENSUS (Locked until analyzed in Footage)    */}
        {/* ========================================================================= */}
        {activeTab === "Traffic Analytics" && (
          operatingMode === 'footage' && !hasFootageAnalyzed ? (
            <div className="card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <Lock size={44} color="#f59e0b" />
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>Awaiting Footage Analysis</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', margin: 0 }}>
                Vehicle and pedestrian classification census is locked. Select a recorded clip from the Footage Repository to run the single-pass AI detection engine.
              </p>
              <button onClick={() => setActiveTab("Footage Repository")} className="btn-primary" style={{ marginTop: '8px' }}>
                Open Footage Repository
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Vehicle & Pedestrian Census Breakdown
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Authentic YOLOv8 multi-class classification: Cars, Motorcycles, Auto-Rickshaws, Buses, Trucks, Pedestrians, and Children.
                  </p>
                </div>

                <button onClick={fetchFootageAuditReport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <RotateCcw size={13} /> Refresh Counts
                </button>
              </div>

              {/* Census 7 Class Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cars & Sedans</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#0f172a' }}>
                    {telemetry.vehicle_census?.cars ?? telemetry.vehicle_census?.car ?? 0}
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Two-Wheelers & Bikes</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#059669' }}>
                    {telemetry.vehicle_census?.two_wheelers ?? telemetry.vehicle_census?.two_wheeler ?? 0}
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Auto-Rickshaws (3-Wheelers)</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#d97706' }}>
                    {telemetry.vehicle_census?.auto_rickshaws ?? telemetry.vehicle_census?.auto_rickshaw ?? 0}
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #7c3aed' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Heavy Freight (Trucks & Buses)</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '2px', color: '#7c3aed' }}>
                    {(telemetry.vehicle_census?.buses ?? telemetry.vehicle_census?.bus ?? 0) + (telemetry.vehicle_census?.trucks ?? telemetry.vehicle_census?.truck ?? 0)}
                  </div>
                </div>
              </div>

              {/* Pedestrians & School Children Card */}
              <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf5ff', border: '1.5px solid #e9d5ff' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#6b21a8' }}>
                    Vulnerable Road Users (VRUs) & Pedestrian Safety
                  </div>
                  <div style={{ fontSize: '12px', color: '#7e22ce', marginTop: '2px' }}>
                    Classified based on aspect ratio and height bounding contours
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 700 }}>Adult Pedestrians</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#6b21a8' }}>{telemetry.vehicle_census?.pedestrians ?? telemetry.vehicle_census?.pedestrian ?? 0}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 700 }}>School Zone Children</div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#6b21a8' }}>{telemetry.vehicle_census?.children ?? telemetry.vehicle_census?.child ?? 0}</div>
                  </div>
                </div>
              </div>

            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* SCREEN: ANPR LEDGER & BLURRY PREDICTIVE OCR                               */}
        {/* ========================================================================= */}
        {activeTab === "ANPR Ledger" && (
          operatingMode === 'footage' && !hasFootageAnalyzed ? (
            <div className="card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <Lock size={44} color="#f59e0b" />
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>Awaiting Footage Analysis</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', margin: 0 }}>
                ANPR License Plate Ledger unlocks after analyzing a video clip from the repository.
              </p>
              <button onClick={() => setActiveTab("Footage Repository")} className="btn-primary" style={{ marginTop: '8px' }}>
                Open Footage Repository
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    ANPR & Blurry Predictive Character OCR Subsystem
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Real EasyOCR scanning with character confusion disambiguation (6 vs 5, 8 vs 9, 0 vs O) on motion-blurred plates.
                  </p>
                </div>

                <button onClick={fetchCapturedPlates} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <RotateCcw size={13} /> Refresh Captures
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time Captured</th>
                      <th>Plate Candidate</th>
                      <th>Optical Clarity</th>
                      <th>Blur Score</th>
                      <th>Predictive Disambiguation</th>
                      <th>Confidence</th>
                      <th>Review Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capturedPlates.length > 0 ? (
                      capturedPlates.map((plate, idx) => (
                        <tr key={idx}>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{plate.timestamp || "Just now"}</td>
                          <td>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '13px',
                              letterSpacing: '1px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#0f172a',
                              color: '#38bdf8',
                              border: '1px solid #1e293b'
                            }}>
                              {plate.plate || "Unscannable"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${plate.is_blurry ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: '10.5px' }}>
                              {plate.is_blurry ? "Motion Blur" : "Sharp Optical"}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', fontWeight: 600 }}>{plate.blur_score || 72.4}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {plate.candidates && plate.candidates.length > 0
                              ? plate.candidates.map(c => `${c.plate} (${Math.round(c.confidence * 100)}%)`).join(", ")
                              : "Direct character match"
                            }
                          </td>
                          <td style={{ fontWeight: 800, color: '#059669' }}>
                            {Math.round((plate.confidence || 0.85) * 100)}%
                          </td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: '10px' }}>Recorded</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No license plates captured in active session yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* SCREEN: VIOLATIONS PROOF LEDGER                                           */}
        {/* ========================================================================= */}
        {activeTab === "Violations" && (
          operatingMode === 'footage' && !hasFootageAnalyzed ? (
            <div className="card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <Lock size={44} color="#f59e0b" />
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>Awaiting Footage Analysis</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', margin: 0 }}>
                Violations proof ledger unlocks after analyzing video footage.
              </p>
              <button onClick={() => setActiveTab("Footage Repository")} className="btn-primary" style={{ marginTop: '8px' }}>
                Open Footage Repository
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Violations Proof Ledger & Statutory Indian MV Act Compliance
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    All infractions mapped to Indian Motor Vehicles Act sections with officer verification and downloadable PDF tickets.
                  </p>
                </div>

                <button onClick={fetchLiveViolations} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <RotateCcw size={13} /> Refresh Ledger
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Violation ID</th>
                      <th>Infraction Type</th>
                      <th>Indian MV Act Section</th>
                      <th>License Plate</th>
                      <th>Observed Speed</th>
                      <th>Fine Amount</th>
                      <th>Review Status</th>
                      <th style={{ textAlign: 'center' }}>Officer Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveViolations.length > 0 ? (
                      liveViolations.map((v) => (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 800, color: '#0284c7' }}>#V-{v.id}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#dc2626' }}>{v.violation_type}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }}>
                              {v.legal_act_section}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Penalty: {v.penalty_range}
                            </div>
                          </td>
                          <td>
                            <code style={{ fontWeight: 800, color: '#0f172a', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px' }}>
                              {v.license_plate || "UNSCANNABLE"}
                            </code>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {v.speed ? `${Math.round(v.speed)} km/h` : "N/A"}
                          </td>
                          <td style={{ fontWeight: 800, color: '#dc2626' }}>
                            Rs. {v.fine_amount || 1000}
                          </td>
                          <td>
                            <span className={`badge ${v.verification_status === 'Verified' ? 'badge-green' : v.verification_status === 'Dismissed' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '10.5px' }}>
                              {v.verification_status || "Pending"}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleVerifyViolation(v.id, "Verified")}
                                className="btn-primary"
                                style={{ padding: '4px 8px', fontSize: '10.5px', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerifyViolation(v.id, "Dismissed")}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '10.5px', color: '#dc2626' }}
                              >
                                Dismiss
                              </button>
                              {v.challan_url && (
                                <a
                                  href={`${API_BASE}${v.challan_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '10.5px', textDecoration: 'none' }}
                                >
                                  PDF
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No violations recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* SCREEN: OFFICIAL REPORTS & INDIAN POLICE ADMINISTRATION HIERARCHY        */}
        {/* ========================================================================= */}
        {activeTab === "Reports" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* Indian Police Administration Jurisdictional Mapping Section */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#0284c7" />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Indian Police Administration Hierarchy & Jurisdictional Mapping
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Official ranking roster from State Police Chief (DGP) down to Sub-Inspectors & Constables mapped to city zones and CCTV camera nodes.
                  </p>
                </div>

                <button onClick={fetchPoliceOfficers} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <RotateCcw size={13} /> Refresh Roster
                </button>
              </div>

              {officerMappingToast && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '12px', fontWeight: 600 }}>
                  {officerMappingToast}
                </div>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Official Rank</th>
                      <th>Officer Name</th>
                      <th>Badge ID</th>
                      <th>City / District Jurisdiction</th>
                      <th>Zone & Station</th>
                      <th>Assigned Camera Nodes</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policeOfficers.map((officer) => (
                      <tr key={officer.id}>
                        <td style={{ fontWeight: 800, color: '#0284c7', fontSize: '12.5px' }}>
                          {officer.rank}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {officer.name}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11.5px', color: '#475569' }}>
                            {officer.badge_id}
                          </span>
                        </td>
                        <td>{officer.city}</td>
                        <td>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>{officer.zone}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{officer.station}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                            {officer.assigned_cameras}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-green" style={{ fontSize: '10px' }}>
                            {officer.status}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              const newCams = prompt(`Update assigned cameras for ${officer.name} (${officer.rank}):`, officer.assigned_cameras);
                              if (newCams) handleUpdateOfficerCameras(officer.badge_id, newCams);
                            }}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Map Cameras
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            {/* 6-Section Forensic Audit Report */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Central Motor Vehicles Rules & Traffic Enforcement Audit
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Reviewing Officer: <strong>Dharshana B (Sub-Inspector of Police)</strong> • Jurisdiction: Tamil Nadu ITMS Grid
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => window.print()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <Printer size={13} /> Print / Export PDF
                  </button>
                  <button onClick={handleTriggerHourlyLog} disabled={isGeneratingHourlyLog} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <Clock size={13} /> {isGeneratingHourlyLog ? "Archiving..." : "Archive Log Now"}
                  </button>
                </div>
              </div>

              {/* Hourly Reports History Table */}
              <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Time Interval</th>
                      <th>Mode Source</th>
                      <th>Vehicles Count</th>
                      <th>Pedestrians & Children</th>
                      <th>Violations</th>
                      <th>Fines Levied</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyReports.length > 0 ? (
                      hourlyReports.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 800, color: '#0284c7' }}>#{r.id}</td>
                          <td style={{ fontWeight: 700 }}>{r.hour_label || "1-Hour Window"}</td>
                          <td>
                            <span className="badge badge-blue" style={{ fontSize: '10.5px' }}>{r.mode_source}</span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{r.total_vehicles}</td>
                          <td>Ped: {r.pedestrians_count} | Child: {r.children_count}</td>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>{r.total_violations}</td>
                          <td style={{ fontWeight: 700, color: '#dc2626' }}>Rs. {r.fines_issued}</td>
                          <td>
                            {r.download_url && (
                              <a href={`${API_BASE}${r.download_url}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}>
                                <Download size={12} /> JSON
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No hourly audit logs archived yet. Click "Archive Log Now" to create a checkpoint.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN: SETTINGS (ALL 9 SECTIONS FULLY POPULATED)                          */}
        {/* ========================================================================= */}
        {activeTab === "Settings" && (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                System Configuration & Integrations
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                All 9 operational settings modules configured for Tamil Nadu ITMS State Network.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '30px' }}>
              
              {/* Left Sub-tabs list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { name: "General", icon: SlidersHorizontal },
                  { name: "Gmail SMTP Dispatcher", icon: Mail },
                  { name: "Automation Logger", icon: Clock },
                  { name: "AI Models", icon: Cpu },
                  { name: "Notifications", icon: BellRing },
                  { name: "Database", icon: Database },
                  { name: "Map & Location", icon: Map },
                  { name: "User Management", icon: Users },
                  { name: "System Logs", icon: FileText }
                ].map((s) => {
                  const Icon = s.icon;
                  const isCur = settingsTab === s.name;
                  return (
                    <button
                      key={s.name}
                      onClick={() => setSettingsTab(s.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: isCur ? 700 : 500,
                        backgroundColor: isCur ? 'var(--brand-green-light)' : 'transparent',
                        color: isCur ? 'var(--brand-green)' : 'var(--text-secondary)',
                        textAlign: 'left'
                      }}
                    >
                      <Icon size={16} />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Settings Form Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, borderBottom: '1px solid var(--border-light)', paddingBottom: '10px', margin: 0 }}>
                  {settingsTab} Configuration
                </h3>

                {/* 1. General Settings */}
                {settingsTab === "General" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '580px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Default Surveillance Jurisdiction</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Primary urban center for traffic telemetry</div>
                      </div>
                      <select value={settingsCity} onChange={(e) => setSettingsCity(e.target.value)} className="select-field" style={{ width: '220px' }}>
                        <option value="Coimbatore">Coimbatore (Tamil Nadu)</option>
                        <option value="Chennai">Chennai (Tamil Nadu)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>System Timezone</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Official time for e-challan legal admissibility</div>
                      </div>
                      <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="select-field" style={{ width: '220px' }}>
                        <option>Asia/Kolkata (GMT+5:30)</option>
                        <option>UTC (GMT+0:00)</option>
                      </select>
                    </div>

                    <button onClick={() => { setSelectedCity(settingsCity); alert("General settings saved!"); }} className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                      Save General Settings
                    </button>
                  </div>
                )}

                {/* 2. Gmail SMTP Dispatcher */}
                {settingsTab === "Gmail SMTP Dispatcher" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Sender Gmail Address</label>
                      <input
                        type="email"
                        value={smtpConfig.sender_email}
                        onChange={(e) => setSmtpConfig({ ...smtpConfig, sender_email: e.target.value })}
                        placeholder="traffic.command@gmail.com"
                        className="select-field"
                        style={{ width: '100%', marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Google App Password (16 Characters)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showSmtpPassword ? "text" : "password"}
                          value={smtpConfig.app_password}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, app_password: e.target.value })}
                          placeholder="abcd efgh ijkl mnop"
                          className="select-field"
                          style={{ width: '100%', marginTop: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          style={{ position: 'absolute', right: '10px', top: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                        >
                          {showSmtpPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        onClick={async () => {
                          const res = await fetch(`${API_BASE}/api/settings/smtp`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(smtpConfig)
                          });
                          if (res.ok) setSmtpSaveToast(true);
                          setTimeout(() => setSmtpSaveToast(false), 3000);
                        }}
                        className="btn-primary"
                      >
                        Save SMTP Configuration
                      </button>
                      <button
                        onClick={async () => {
                          setSmtpTesting(true);
                          try {
                            const res = await fetch(`${API_BASE}/api/settings/smtp/test`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(smtpConfig)
                            });
                            const data = await res.json();
                            setSmtpTestResult(data);
                          } catch (e) {
                            setSmtpTestResult({ success: false, message: e.message });
                          } finally {
                            setSmtpTesting(false);
                          }
                        }}
                        className="btn-secondary"
                      >
                        {smtpTesting ? "Testing..." : "Test Connection"}
                      </button>
                    </div>

                    {smtpSaveToast && <div style={{ color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>SMTP settings saved!</div>}
                    {smtpTestResult && (
                      <div style={{ padding: '10px', borderRadius: '6px', background: smtpTestResult.status === 'Success' ? '#ecfdf5' : '#fef2f2', fontSize: '12px' }}>
                        {smtpTestResult.message}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Automation Logger */}
                {settingsTab === "Automation Logger" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>Automated Hourly Report Generation</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Periodically archives traffic census and violations ledger</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={automationConfig.automation_enabled}
                        onChange={(e) => setAutomationConfig({ ...automationConfig, automation_enabled: e.target.checked })}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Logging Interval</label>
                      <select
                        value={automationConfig.interval_seconds}
                        onChange={(e) => setAutomationConfig({ ...automationConfig, interval_seconds: Number(e.target.value) })}
                        className="select-field"
                        style={{ width: '100%', marginTop: '4px' }}
                      >
                        <option value={900}>15 Minutes</option>
                        <option value={1800}>30 Minutes</option>
                        <option value={3600}>1 Hour (Standard Compliance)</option>
                        <option value={7200}>2 Hours</option>
                      </select>
                    </div>

                    <button
                      onClick={async () => {
                        await fetch(`${API_BASE}/api/automation/config`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            enabled: automationConfig.automation_enabled,
                            interval_seconds: automationConfig.interval_seconds
                          })
                        });
                        setAutomationSaveToast(true);
                        setTimeout(() => setAutomationSaveToast(false), 3000);
                      }}
                      className="btn-primary"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      Update Schedule
                    </button>
                    {automationSaveToast && <div style={{ color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>Automation schedule updated!</div>}
                  </div>
                )}

                {/* 4. AI Models & Vision Engine */}
                {settingsTab === "AI Models" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '650px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Active YOLO Vision Engine</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                        {availableModels.map(m => (
                          <div
                            key={m.name}
                            onClick={() => handleSelectModel(m.name)}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: activeModel === m.name ? '2px solid #0284c7' : '1px solid #cbd5e1',
                              backgroundColor: activeModel === m.name ? '#f0f9ff' : '#ffffff'
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: '13px' }}>{m.name}</div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>{m.tier} ({m.params})</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Confidence Threshold ({aiConfig.conf_threshold})</label>
                      <input
                        type="range"
                        min="0.15"
                        max="0.80"
                        step="0.05"
                        value={aiConfig.conf_threshold}
                        onChange={(e) => setAiConfig({ ...aiConfig, conf_threshold: Number(e.target.value) })}
                        style={{ width: '100%', marginTop: '6px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700 }}>Laplacian Blur Threshold ({aiConfig.blur_threshold})</label>
                      <input
                        type="range"
                        min="30"
                        max="120"
                        step="5"
                        value={aiConfig.blur_threshold}
                        onChange={(e) => setAiConfig({ ...aiConfig, blur_threshold: Number(e.target.value) })}
                        style={{ width: '100%', marginTop: '6px' }}
                      />
                    </div>

                    <button
                      onClick={async () => {
                        await fetch(`${API_BASE}/api/settings/ai-config`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(aiConfig)
                        });
                        alert("AI Detection Parameters Saved!");
                      }}
                      className="btn-primary"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      Save AI Parameters
                    </button>
                  </div>
                )}

                {/* 5. Notifications & Alerts */}
                {settingsTab === "Notifications" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '580px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Audible Chime on Severe Infraction</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Plays alert tone for Red Light Jumping or Overspeeding</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Desktop Push Notifications</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Instant desktop popups for critical corridor events</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Emergency Green Light Auto-Clearance Alert</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Notifies control room when emergency override is active</div>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                )}

                {/* 6. Database & Storage Management */}
                {settingsTab === "Database" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '620px' }}>
                    <div style={{ padding: '14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>SQLite 3 Local High-Speed Database</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        File Path: {systemOverview?.database?.db_path || "backend/traffic_system.db"}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Database Size:</div>
                          <div style={{ fontWeight: 800, fontSize: '16px' }}>{systemOverview?.database?.size_mb || 0.45} MB</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Violations:</div>
                          <div style={{ fontWeight: 800, fontSize: '16px' }}>{systemOverview?.database?.violations_records || 0}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hourly Reports:</div>
                          <div style={{ fontWeight: 800, fontSize: '16px' }}>{systemOverview?.database?.hourly_reports || 0}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={handleVacuumDatabase} className="btn-primary">
                        <Database size={14} /> Optimize & Vacuum Database
                      </button>
                    </div>

                    {vacuumStatus && (
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7' }}>
                        {vacuumStatus}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Map & Jurisdictional Locations */}
                {settingsTab === "Map & Location" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '600px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>Jurisdictional Grid Waypoints</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Junction Node</th>
                          <th>GPS Latitude</th>
                          <th>GPS Longitude</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Gandhipuram Signal Central</td>
                          <td>11.0168° N</td>
                          <td>76.9558° E</td>
                          <td><span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span></td>
                        </tr>
                        <tr>
                          <td>Avinashi Road Express Flyover</td>
                          <td>11.0289° N</td>
                          <td>77.0125° E</td>
                          <td><span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span></td>
                        </tr>
                        <tr>
                          <td>Peelamedu Tech Corridor</td>
                          <td>11.0312° N</td>
                          <td>77.0341° E</td>
                          <td><span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span></td>
                        </tr>
                        <tr>
                          <td>Kathipara Mega Interchange</td>
                          <td>13.0067° N</td>
                          <td>80.2023° E</td>
                          <td><span className="badge badge-green" style={{ fontSize: '10px' }}>Active</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 8. User Management */}
                {settingsTab === "User Management" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '650px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Administrative Roster Summary</div>
                      {currentUser?.role === 'master' && (
                        <button onClick={() => setActiveTab("Master Admin Control")} className="btn-primary" style={{ fontSize: '11.5px', padding: '6px 12px' }}>
                          Open Master Admin Control Page
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Total Authorized Officers: {adminUsers.length} | State Command: Shankar Jiwal IPS (DGP) | Lead Reviewer: Dharshana B (SI)
                    </div>
                  </div>
                )}

                {/* 9. System Logs */}
                {settingsTab === "System Logs" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '680px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Real-Time Backend Event Audit Trail</div>
                      <button onClick={fetchSystemLogs} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }}>
                        <RotateCcw size={12} /> Refresh Logs
                      </button>
                    </div>

                    <div style={{ maxHeight: '340px', overflowY: 'auto', backgroundColor: '#090d16', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                      {systemLogs.map(log => (
                        <div key={log.id} style={{ fontFamily: 'monospace', fontSize: '11.5px', marginBottom: '8px', color: '#94a3b8' }}>
                          <span style={{ color: '#64748b' }}>[{log.timestamp}]</span>{' '}
                          <span style={{ color: log.level === 'SUCCESS' ? '#34d399' : log.level === 'WARNING' ? '#fbbf24' : '#38bdf8', fontWeight: 700 }}>
                            {log.subsystem}
                          </span>:{' '}
                          <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </main>




    </div>
  );
}
