import os
from pathlib import Path
from dotenv import load_dotenv

# Locate root project directory and .env file
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    PROJECT_NAME: str = "AI Intelligent Traffic Management System"
    VERSION: str = "1.0.0"
    BASE_DIR: Path = ROOT_DIR
    BACKEND_DIR: Path = BACKEND_DIR

    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    # MongoDB Atlas
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb+srv://cluster.mongodb.net/traffic_db")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "traffic_db")

    # Alert Gateway (SMTP / Carrier SMS)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")
    ALERT_RECIPIENT_SMS_GATEWAY: str = os.getenv("ALERT_RECIPIENT_SMS_GATEWAY", "")
    ALERT_RECIPIENT_EMAIL: str = os.getenv("ALERT_RECIPIENT_EMAIL", "")

    # Server Config
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    CORS_ORIGINS: list[str] = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    # Storage paths
    UPLOAD_DIR: Path = BACKEND_DIR / "uploads"
    SNAPSHOT_DIR: Path = BACKEND_DIR / "uploads" / "violations"
    DATA_DIR: Path = BACKEND_DIR / "data"

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
