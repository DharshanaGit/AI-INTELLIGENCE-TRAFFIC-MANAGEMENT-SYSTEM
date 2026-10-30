import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from database.db import SessionLocal
from database.models import HourlyReport, Violation, TrafficLog, SystemSetting
from core.email_dispatcher import SMTPEmailDispatcher

class HourlyLogger:
    """
    Automated Traffic Logging Service for ITMS with Customizable Timing & Email Dispatch.
    - Configurable logging interval (e.g. 15m, 30m, 1h, 2h).
    - Automation Toggle: ON / OFF.
    - Tracks start_time and end_time.
    - Integrates pedestrian and child census.
    - Dispatches automatic email briefing with PDF report to Control Center, Inspector, & Traffic Head.
    """

    def __init__(self, reports_dir: str):
        self.reports_dir = reports_dir
        os.makedirs(self.reports_dir, exist_ok=True)
        self.is_running = False
        self.automation_enabled = True
        self.interval_seconds = 3600 # Default: 1 hour
        self.last_log_time: datetime = datetime.utcnow()
        self.email_dispatcher = SMTPEmailDispatcher()

    def set_config(self, enabled: bool, interval_seconds: int):
        self.automation_enabled = enabled
        self.interval_seconds = max(60, interval_seconds)
        print(f"[HourlyLogger] Updated config: Enabled={self.automation_enabled}, Interval={self.interval_seconds}s")

    def get_config(self) -> Dict[str, Any]:
        next_run = (self.last_log_time + timedelta(seconds=self.interval_seconds)).isoformat() if self.last_log_time else None
        return {
            "automation_enabled": self.automation_enabled,
            "interval_seconds": self.interval_seconds,
            "interval_label": f"{self.interval_seconds // 60} minutes" if self.interval_seconds < 3600 else f"{round(self.interval_seconds / 3600, 1)} hours",
            "last_log_time": self.last_log_time.isoformat() if self.last_log_time else None,
            "next_scheduled_run": next_run
        }

    def generate_hourly_report(
        self,
        pipeline,
        mode_source: str = "Live Surveillance",
        custom_hour_label: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Gathers telemetry, classification breakdown, and violations between start_time and end_time.
        Archives record to SQLite database, saves standalone JSON report, and dispatches SMTP email.
        """
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(seconds=self.interval_seconds)
        hour_label = custom_hour_label or f"{start_time.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%H:%M')} UTC"

        db: Session = SessionLocal()
        try:
            # Query violations during this specific timing interval
            recent_violations = db.query(Violation).filter(Violation.timestamp >= start_time).all()
            if not recent_violations and len(pipeline.latest_violations) > 0:
                v_count = len(pipeline.latest_violations)
                fines_sum = sum(v.get("fine_amount", 1000) for v in pipeline.latest_violations)
            else:
                v_count = len(recent_violations)
                fines_sum = sum(v.fine_amount for v in recent_violations)

            # Query traffic logs
            recent_logs = db.query(TrafficLog).filter(TrafficLog.timestamp >= start_time).all()
            if recent_logs:
                avg_congestion = round(sum(l.congestion_index for l in recent_logs) / len(recent_logs), 1)
                total_veh = sum(l.total_vehicles for l in recent_logs)
            else:
                stats = pipeline.last_stats or {}
                avg_congestion = stats.get("congestion_index", 25.0)
                total_veh = stats.get("total_vehicles", 0)

            # Census breakdown directly from pipeline (vehicles + pedestrians + children)
            breakdown = getattr(pipeline, "vehicle_class_counts", {
                "car": 0, "two_wheeler": 0, "auto_rickshaw": 0, "bus": 0, "truck": 0,
                "bicycle": 0, "pedestrian": 0, "child": 0
            }).copy()

            filename = f"report_{end_time.strftime('%Y%m%d_%H%M%S')}.json"
            filepath = os.path.join(self.reports_dir, filename)

            report_data = {
                "hour_label": hour_label,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "generated_at": end_time.isoformat(),
                "mode_source": mode_source,
                "active_camera_or_feed": pipeline.custom_video_source or "Procedural 4-Lane Intersection",
                "traffic_summary": {
                    "total_vehicles_processed": total_veh,
                    "average_congestion_index": avg_congestion,
                    "lane_distribution": stats.get("lane_counts", {1: 0, 2: 0, 3: 0, 4: 0}) if 'stats' in locals() else {}
                },
                "vehicle_class_breakdown": breakdown,
                "violation_audit": {
                    "total_violations": v_count,
                    "total_fines_issued_inr": fines_sum,
                    "violations_sample": [
                        {
                            "id": v.get("id"),
                            "type": v.get("violation_type"),
                            "legal_act_section": v.get("legal_act_section"),
                            "plate": v.get("license_plate"),
                            "fine": v.get("fine_amount")
                        } for v in pipeline.latest_violations[:10]
                    ]
                },
                "anpr_summary": {
                    "total_plates_captured": len(getattr(pipeline, "captured_plates", [])),
                    "recent_plates": [
                        p["plate"] for p in getattr(pipeline, "captured_plates", [])[-10:]
                    ]
                }
            }

            # Save JSON file
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2)

            # Save DB record
            db_report = HourlyReport(
                timestamp=end_time,
                start_time=start_time,
                end_time=end_time,
                hour_label=hour_label,
                total_vehicles=total_veh,
                cars_count=breakdown.get("car", 0),
                two_wheelers_count=breakdown.get("two_wheeler", 0),
                auto_rickshaws_count=breakdown.get("auto_rickshaw", 0),
                buses_count=breakdown.get("bus", 0),
                trucks_count=breakdown.get("truck", 0),
                pedestrians_count=breakdown.get("pedestrian", 0),
                children_count=breakdown.get("child", 0),
                total_violations=v_count,
                fines_issued=fines_sum,
                avg_congestion=avg_congestion,
                report_filename=filename,
                mode_source=mode_source
            )
            db.add(db_report)
            db.commit()
            db.refresh(db_report)

            self.last_log_time = end_time
            print(f"[HourlyLogger] Successfully archived report #{db_report.id} ({hour_label}) -> {filename}")

            report_data["id"] = db_report.id
            report_data["report_filename"] = filename
            report_data["download_url"] = f"/api/reports-files/{filename}"

            # Check if SMTP email dispatch is configured in system settings
            try:
                smtp_setting = db.query(SystemSetting).filter(SystemSetting.key == "smtp_config").first()
                if smtp_setting and smtp_setting.value:
                    smtp_conf = json.loads(smtp_setting.value)
                    if smtp_conf.get("sender_email") and smtp_conf.get("app_password"):
                        print(f"[HourlyLogger] Dispatching automated email report #{db_report.id} to Command Center & Inspectors...")
                        ok, msg = self.email_dispatcher.send_report_email(smtp_conf, report_data)
                        print(f"[HourlyLogger] Email Dispatch Result: {msg}")
            except Exception as mail_err:
                print(f"[HourlyLogger] Email dispatch note: {mail_err}")

            return report_data
        except Exception as e:
            print(f"[HourlyLogger] Error generating report: {e}")
            db.rollback()
            return {"error": str(e)}
        finally:
            db.close()

    async def periodic_task(self, pipeline):
        """Asynchronous worker that honors interval_seconds and automation_enabled toggle"""
        self.is_running = True
        print(f"[HourlyLogger] Started periodic automated logging worker (Interval: {self.interval_seconds}s, Enabled: {self.automation_enabled}).")
        while self.is_running:
            try:
                # Sleep in short intervals to quickly react to config changes
                target_seconds = self.interval_seconds
                for _ in range(max(1, target_seconds // 5)):
                    if not self.is_running:
                        break
                    await asyncio.sleep(5)

                if self.automation_enabled:
                    mode = "Live Surveillance" if (pipeline.custom_video_source and pipeline.custom_video_source.startswith("http")) else "Footage Analysis"
                    self.generate_hourly_report(pipeline, mode_source=mode)
                else:
                    await asyncio.sleep(10)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[HourlyLogger] Background loop error: {e}")
                await asyncio.sleep(30)
