import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, Any, List, Tuple, Optional

class SMTPEmailDispatcher:
    """
    Automated SMTP Dispatcher for ITMS.
    Dispatches automated traffic audit reports and legal e-challans to:
    1. City Traffic Control Command Center
    2. Camera Division Field Inspector
    3. Traffic Headquarters / Chief of Police
    Using standard Gmail App Passwords (16-char) or custom SMTP relay.
    """

    def __init__(self):
        pass

    def test_connection(self, config: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validates SMTP credentials by connecting, authenticating, and sending a handshake test.
        """
        host = config.get("smtp_host", "smtp.gmail.com")
        port = int(config.get("smtp_port", 587))
        sender = config.get("sender_email", "").strip()
        password = config.get("app_password", "").strip().replace(" ", "")
        use_tls = config.get("use_tls", True)

        if not sender or not password:
            return False, "Sender email and Gmail App Password are required."

        try:
            server = smtplib.SMTP(host, port, timeout=10)
            if use_tls:
                server.starttls()
            server.login(sender, password)
            server.quit()
            return True, f"Successfully authenticated with SMTP server ({host}:{port}) as {sender}!"
        except smtplib.SMTPAuthenticationError as auth_err:
            return False, f"SMTP Authentication Failed: {auth_err}. If using Gmail, ensure a 16-character 'App Password' is generated from your Google Account Security settings."
        except Exception as err:
            return False, f"SMTP Connection Error: {str(err)}"

    def send_report_email(
        self,
        config: Dict[str, Any],
        report: Dict[str, Any],
        pdf_path: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Formats a structured HTML traffic audit briefing and attaches the PDF report.
        Sends simultaneously to Control Center, Division Inspector, and Traffic Head.
        """
        host = config.get("smtp_host", "smtp.gmail.com")
        port = int(config.get("smtp_port", 587))
        sender = config.get("sender_email", "").strip()
        password = config.get("app_password", "").strip().replace(" ", "")
        use_tls = config.get("use_tls", True)

        # Collect recipient addresses
        recipients = []
        for key in ["control_center_email", "division_inspector_email", "traffic_head_email"]:
            val = config.get(key, "").strip()
            if val and "@" in val:
                recipients.append(val)

        if not recipients:
            return False, "No valid recipient email addresses configured."

        if not sender or not password:
            return False, "Sender email and Gmail App Password are required."

        # Parse report details
        sec1 = report.get("section_1_metadata", {})
        sec2 = report.get("section_2_traffic_flow", {})
        sec3 = report.get("section_3_vehicle_classification", {})
        sec4 = report.get("section_4_violations_evidence", {})
        sec6 = report.get("section_6_export_audit", {})

        src_name = sec1.get("filename", "Live Surveillance Stream")
        officer = sec6.get("audit_officer", "Dharshana B (Admin)")
        jurisdiction = sec6.get("jurisdiction", "Tamil Nadu Traffic Police / ITMS Grid")
        total_veh = sec2.get("total_vehicles_observed", report.get("total_vehicles", 0))
        total_viols = sec4.get("total_violations_recorded", report.get("total_violations", 0))
        total_fines = sec4.get("total_fines_levied_inr", report.get("fines_issued", 0))
        congestion = sec2.get("current_congestion_index", report.get("avg_congestion", 0.0))
        rep_hash = sec6.get("report_hash", "ITMS-AUDIT-VERIFIED")

        subject = f"[ITMS OFFICIAL AUDIT] Traffic Surveillance Report - {src_name} ({total_veh} Vehicles | {total_viols} Violations)"

        # Professional HTML Email Body
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 650px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 28px; margin: auto; }}
            .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }}
            .title {{ font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; margin-top: 6px; }}
            .kpi-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 20px 0; }}
            .kpi-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }}
            .kpi-val {{ font-size: 22px; font-weight: 800; color: #0284c7; }}
            .kpi-lbl {{ font-size: 11px; color: #64748b; text-transform: uppercase; }}
            .table {{ width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }}
            .table th, .table td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
            .table th {{ background: #f1f5f9; color: #475569; }}
            .footer {{ margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">TRAFFICSENSE AI — STATUTORY TRAFFIC AUDIT REPORT</div>
              <div class="badge">JURISDICTION: {jurisdiction}</div>
            </div>

            <p style="font-size: 13.5px; line-height: 1.5;">
              This is an official automated dispatch generated by the Intelligent Traffic Management System (ITMS).
              The analytical surveillance session for <strong>{src_name}</strong> has been archived and logged with cryptographic chain-of-custody verification.
            </p>

            <div class="kpi-grid">
              <div class="kpi-box">
                <div class="kpi-val">{total_veh}</div>
                <div class="kpi-lbl">Vehicles Counted</div>
              </div>
              <div class="kpi-box">
                <div class="kpi-val" style="color: #ef4444;">{total_viols}</div>
                <div class="kpi-lbl">Violations Registered</div>
              </div>
              <div class="kpi-box">
                <div class="kpi-val" style="color: #10b981;">&#8377;{total_fines:,}</div>
                <div class="kpi-lbl">Statutory Fines (INR)</div>
              </div>
            </div>

            <table class="table">
              <tr><th>Inspection Parameter</th><th>Verified Telemetry</th></tr>
              <tr><td>Surveillance Node / File</td><td>{src_name}</td></tr>
              <tr><td>Average Congestion Index</td><td>{congestion}%</td></tr>
              <tr><td>Certified Inspecting Officer</td><td>{officer}</td></tr>
              <tr><td>Cryptographic Audit Hash</td><td><code>{rep_hash}</code></td></tr>
            </table>

            <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
              <strong>Recipient Distribution:</strong><br>
              &#8226; Control Command Center: {config.get('control_center_email', 'Active')}<br>
              &#8226; Camera Division Inspector: {config.get('division_inspector_email', 'Active')}<br>
              &#8226; Traffic Headquarters: {config.get('traffic_head_email', 'Active')}
            </p>

            <div class="footer">
              Tamil Nadu Traffic Police Department &bull; ITMS Grid Automated Dispatch &bull; Strictly Confidential
            </div>
          </div>
        </body>
        </html>
        """

        try:
            msg = MIMEMultipart("mixed")
            msg["From"] = f"TrafficSense ITMS <{sender}>"
            msg["To"] = ", ".join(recipients)
            msg["Subject"] = subject

            # Attach HTML Body
            msg.attach(MIMEText(html_content, "html"))

            # Attach PDF Report if available
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={os.path.basename(pdf_path)}"
                )
                msg.attach(part)

            # Send via SMTP
            server = smtplib.SMTP(host, port, timeout=15)
            if use_tls:
                server.starttls()
            server.login(sender, password)
            server.sendmail(sender, recipients, msg.as_string())
            server.quit()

            return True, f"Successfully dispatched official traffic report to {len(recipients)} command recipients!"
        except Exception as e:
            return False, f"Failed to send email dispatch: {str(e)}"
