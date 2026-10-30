import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ChallanGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_pdf(self, violation: dict, snapshot_path: str = None) -> str:
        """
        Generates an official-looking E-Challan PDF ticket.
        Returns the absolute filepath to the generated PDF.
        """
        v_id = violation.get("id", "001")
        filename = f"challan_{v_id}_{int(datetime.utcnow().timestamp())}.pdf"
        filepath = os.path.join(self.output_dir, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'ChallanTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=colors.HexColor('#1E293B'),
            alignment=1, # Center
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'ChallanSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            textColor=colors.HexColor('#64748B'),
            alignment=1,
            spaceAfter=15
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            fontName='Helvetica-Bold',
            fontSize=12,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=10,
            spaceAfter=6
        )

        elements = []

        # Header Title
        elements.append(Paragraph("SMART TRAFFIC ENFORCEMENT AUTHORITY", title_style))
        elements.append(Paragraph("AUTOMATED DIGITAL E-CHALLAN & NOTICE OF VIOLATION", subtitle_style))
        elements.append(Spacer(1, 10))

        # Notice Metadata Table
        ts_str = violation.get("timestamp")
        if isinstance(ts_str, datetime):
            ts_str = ts_str.strftime("%Y-%m-%d %H:%M:%S UTC")
        else:
            ts_str = str(ts_str or datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))

        meta_data = [
            [Paragraph("<b>Challan Number:</b>", styles['Normal']), Paragraph(f"ECH-{datetime.utcnow().year}-{v_id:06d}", styles['Normal']),
             Paragraph("<b>Issue Date/Time:</b>", styles['Normal']), Paragraph(ts_str, styles['Normal'])],
            [Paragraph("<b>Camera ID:</b>", styles['Normal']), Paragraph(f"CAM-ITMS-0{violation.get('lane_id', 1)}", styles['Normal']),
             Paragraph("<b>Jurisdiction:</b>", styles['Normal']), Paragraph("Central Urban Traffic Division", styles['Normal'])],
        ]
        meta_table = Table(meta_data, colWidths=[1.8 * inch, 2.0 * inch, 1.6 * inch, 2.1 * inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 15))

        # Offense Details Table
        elements.append(Paragraph("INCIDENT & VEHICLE DETAILS", section_style))
        offense_data = [
            ["Vehicle Type", violation.get("vehicle_type", "Automobile")],
            ["Registration No. (Plate)", violation.get("license_plate", "UNKNOWN")],
            ["Violation Category", violation.get("violation_type", "General Traffic Infraction")],
            ["Monitored Speed", f"{violation.get('speed', 0.0)} km/h"],
            ["Lane Identifier", f"Lane {violation.get('lane_id', 1)}"],
            ["AI Confidence Score", f"{int(violation.get('confidence', 0.92) * 100)}% Verified"],
            ["Penalty / Fine Amount", f"INR {violation.get('fine_amount', 1000)} /-"],
            ["Compliance Status", violation.get("status", "Issued")]
        ]
        offense_table = Table(offense_data, colWidths=[3.0 * inch, 4.5 * inch])
        offense_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1E293B')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#94A3B8')),
        ]))
        elements.append(offense_table)
        elements.append(Spacer(1, 15))

        # Evidence Media (If snapshot file exists)
        if snapshot_path and os.path.exists(snapshot_path):
            elements.append(Paragraph("PHOTOGRAPHIC EVIDENCE CAPTURE", section_style))
            try:
                img = RLImage(snapshot_path, width=5.5 * inch, height=3.1 * inch)
                elements.append(img)
                elements.append(Spacer(1, 10))
            except Exception as e:
                print(f"[ChallanGenerator] Error embedding snapshot image: {e}")

        # Legal Notice & Payment
        elements.append(Spacer(1, 10))
        legal_text = (
            "<b>NOTICE:</b> This document constitutes formal notice that the vehicle registered with the aforementioned "
            "license plate was recorded committing a traffic regulation violation. The violation was captured and verified "
            "by the Automated AI Video Enforcement System. Failure to remit payment within 15 calendar days may result in "
            "statutory interest and suspension of vehicular registration privileges."
        )
        elements.append(Paragraph(legal_text, ParagraphStyle('Legal', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#475569'))))
        
        doc.build(elements)
        return filepath
