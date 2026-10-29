import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("TrafficDB")

class LocalCollection:
    """Async MongoDB-compatible collection for local persistence fallback"""
    def __init__(self, file_path: str, name: str):
        self.file_path = file_path
        self.name = name
        self._lock = asyncio.Lock()
        self._load()

    def _load(self):
        if not os.path.exists(self.file_path):
            self.data = []
            self._save_sync()
        else:
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception:
                self.data = []

    def _save_sync(self):
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, default=str, indent=2)

    async def insert_one(self, document: Dict[str, Any]):
        async with self._lock:
            doc = dict(document)
            if "_id" not in doc:
                doc["_id"] = f"{self.name}_{int(datetime.utcnow().timestamp()*1000)}"
            if "created_at" not in doc:
                doc["created_at"] = datetime.utcnow().isoformat()
            self.data.insert(0, doc)
            # Limit memory footprint
            if len(self.data) > 2000:
                self.data = self.data[:2000]
            self._save_sync()
            return type("InsertResult", (), {"inserted_id": doc["_id"]})

    def find(self, filter_query: Optional[Dict[str, Any]] = None):
        class Cursor:
            def __init__(self, data):
                self.data = list(data)

            def sort(self, key_or_list, direction=None):
                # Basic sort support
                key = key_or_list if isinstance(key_or_list, str) else key_or_list[0][0]
                reverse = True if (direction == -1 or (isinstance(key_or_list, list) and key_or_list[0][1] == -1)) else False
                self.data.sort(key=lambda x: str(x.get(key, "")), reverse=reverse)
                return self

            def limit(self, n: int):
                self.data = self.data[:n]
                return self

            async def to_list(self, length: Optional[int] = None):
                if length is not None:
                    return self.data[:length]
                return self.data

            def __aiter__(self):
                self._iter = iter(self.data)
                return self

            async def __anext__(self):
                try:
                    return next(self._iter)
                except StopIteration:
                    raise StopAsyncIteration

        items = self.data
        if filter_query:
            items = [
                d for d in items 
                if all(d.get(k) == v for k, v in filter_query.items() if not k.startswith("$"))
            ]
        return Cursor(items)

    async def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        if not filter_query:
            return len(self.data)
        return len([d for d in self.data if all(d.get(k) == v for k, v in filter_query.items())])

    async def create_index(self, *args, **kwargs):
        # In-memory indices are no-ops
        pass

class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_atlas_connected: bool = False
        self.violations = None
        self.telemetry_logs = None

    async def connect(self):
        uri = settings.MONGODB_URI
        if uri and "cluster.mongodb.net" not in uri and "localhost" in uri or "mongodb+srv" in uri:
            try:
                logger.info(f"Connecting to MongoDB: {uri.split('@')[-1] if '@' in uri else uri}")
                self.client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
                await self.client.admin.command('ping')
                self.db = self.client[settings.DATABASE_NAME]
                self.violations = self.db["violations"]
                self.telemetry_logs = self.db["telemetry_logs"]
                self.is_atlas_connected = True

                # Module 7: Compiling high-speed indexes
                await self.violations.create_index([("timestamp", -1)])
                await self.violations.create_index([("license_plate", 1)])
                await self.violations.create_index([("violation_type", 1)])
                await self.telemetry_logs.create_index([("timestamp", -1)])
                logger.info("Successfully connected to MongoDB Atlas & compiled high-speed indexes on timestamp and license_plate")
                return
            except Exception as e:
                logger.warning(f"MongoDB Atlas connection failed ({e}). Falling back to local high-performance async document store.")

        # Local fallback engine
        logger.info("Initializing high-performance local persistent async storage engine.")
        violations_file = str(settings.DATA_DIR / "violations.json")
        telemetry_file = str(settings.DATA_DIR / "telemetry_logs.json")
        self.violations = LocalCollection(violations_file, "violations")
        self.telemetry_logs = LocalCollection(telemetry_file, "telemetry")
        self.is_atlas_connected = False

    async def disconnect(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB client disconnected.")

db_manager = DatabaseManager()
