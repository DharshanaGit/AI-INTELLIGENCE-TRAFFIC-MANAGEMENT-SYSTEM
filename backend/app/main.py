import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import db_manager
from app.api.v1.routes import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("TrafficSystem")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Intelligent Traffic Management System Backend...")
    # Initialize database connection and high-speed indexes
    await db_manager.connect()
    yield
    logger.info("Shutting down AI Intelligent Traffic Management System Backend...")
    await db_manager.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev flex
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for violation snapshots
app.mount("/static/violations", StaticFiles(directory=str(settings.SNAPSHOT_DIR)), name="violations_static")

# Mount API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "operational",
        "docs": "/docs",
        "websocket": "/api/v1/ws/traffic"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
