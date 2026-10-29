import smtplib
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List
from app.core.config import settings

logger = logging.getLogger("NotificationSystem")

class NotificationService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_pass = settings.SMTP_PASS
        self.sms_gateway = settings.ALERT_RECIPIENT_SMS_GATEWAY
        self.email_recipient = settings.ALERT_RECIPIENT_EMAIL

    def format_sms_message(self, violation: Dict[str, Any]) -> str:
        """Module 6: Crisp SMS text payload for carrier cellular networks."""
        return (
            f"[TRAFFIC VIOLATION ALERT]\n"
            f"Type: {violation.get('violation_type')}\n"
            f"Plate: {violation.get('license_plate')}\n"
            f"Vehicle: {violation.get('vehicle_type')}\n"
            f"Lane: {violation.get('lane_id')}\n"
            f"Time: {violation.get('timestamp')}\n"
            f"Fine ID: {violation.get('violation_id')}"
        )

    def format_html_email(self, violation: Dict[str, Any]) -> str:
        """Rich HTML email report for traffic enforcement authorities."""
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; border: 1px solid #e1e4e8; padding: 24px;">
            <h2 style="color: #d73a49; border-bottom: 2px solid #ea4a5a; padding-bottom: 8px;">
              ⚠️ AI Traffic Violation Flagged
            </h2>
            <p>The Intelligent Traffic Management Vision System detected an infraction:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr><td style="padding: 8px; font-weight: bold;">Violation ID:</td><td style="padding: 8px;">{violation.get('violation_id')}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Violation Type:</td><td style="padding: 8px; color: #d73a49; font-weight: bold;">{violation.get('violation_type')}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">License Plate:</td><td style="padding: 8px; font-family: monospace; font-size: 16px; background: #fff3cd; display: inline-block;">{violation.get('license_plate')}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Vehicle Category:</td><td style="padding: 8px;">{violation.get('vehicle_type')}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Lane:</td><td style="padding: 8px;">{violation.get('lane_id')}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Timestamp:</td><td style="padding: 8px;">{violation.get('timestamp')}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Details:</td><td style="padding: 8px;">{violation.get('details')}</td></tr>
            </table>
            <div style="margin-top: 20px; font-size: 12px; color: #6a737d; text-align: center;">
              AI Intelligent Traffic Management System • Automated Audit Notification
            </div>
          </div>
        </body>
        </html>
        """

    def send_notification_sync(self, violation: Dict[str, Any]) -> bool:
        """
        Dispatches email and SMS carrier gateway message via Google SMTP.
        Runs synchronously inside a background thread executor.
        """
        if not self.smtp_user or not self.smtp_pass:
            logger.info(f"[SMS/Email Gateway Mock] Credentials not fully configured. Logged alert for {violation.get('license_plate')}")
            return False

        recipients = []
        if self.sms_gateway:
            recipients.append(self.sms_gateway)
        if self.email_recipient:
            recipients.append(self.email_recipient)

        if not recipients:
            logger.warning("No notification recipients specified.")
            return False

        sms_body = self.format_sms_message(violation)
        html_body = self.format_html_email(violation)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"CRITICAL: Traffic Violation - {violation.get('license_plate')}"
        msg["From"] = self.smtp_user
        msg["To"] = ", ".join(recipients)

        msg.attach(MIMEText(sms_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            logger.info(f"Connecting to SMTP relay {self.smtp_host}:{self.smtp_port}...")
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user, self.smtp_pass)
                server.sendmail(self.smtp_user, recipients, msg.as_string())
            logger.info(f"Successfully transmitted SMS/Email alert to {recipients} for {violation.get('license_plate')}")
            return True
        except Exception as e:
            logger.error(f"Failed to dispatch SMS/Email via SMTP gateway: {e}")
            return False

    async def send_violation_alert(self, violation: Dict[str, Any]):
        """Dispatches violation alert asynchronously without blocking stream."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.send_notification_sync, violation)

notification_service = NotificationService()
