# backend/pdf_generator.py
import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from datetime import datetime

def generate_filled_form_pdf(
    form_title: str,
    filled_data: Dict[str, Any],
    form_fields: List[Dict[str, str]]
) -> bytes:
    """
    Generate a professional, polished PDF with filled form data.
    """
    pdf_buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=0.6*inch,
        leftMargin=0.6*inch,
        topMargin=0.8*inch,
        bottomMargin=0.6*inch,
    )
    
    elements = []
    
    # Define professional styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#1a3a52'),
        spaceAfter=6,
        alignment=1,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#666666'),
        spaceAfter=20,
        alignment=1,
        fontName='Helvetica-Oblique'
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor('#ffffff'),
        spaceAfter=0,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    field_label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1a1a1a'),
        fontName='Helvetica-Bold'
    )
    
    field_value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#333333'),
        fontName='Helvetica'
    )
    
    # Add header
    elements.append(Paragraph(form_title, title_style))
    timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    elements.append(Paragraph(f"Completed on <b>{timestamp}</b>", subtitle_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Group fields into sections (every 5 fields = new section)
    field_sections = []
    current_section = []
    
    for idx, field_info in enumerate(form_fields):
        current_section.append(field_info)
        if len(current_section) == 5 or idx == len(form_fields) - 1:
            field_sections.append(current_section)
            current_section = []
    
    # Generate sections
    for section_num, section_fields in enumerate(field_sections):
        # Build table rows for this section
        table_data = []
        for field_info in section_fields:
            field_name = field_info.get('name', '')
            field_type = field_info.get('type', 'text')
            
            # Only display if user provided data for this field
            if field_name not in filled_data:
                continue
            
            value = filled_data[field_name]
            
            # Format value based on type
            if not value or value == '':
                display_value = "[Not provided]"
            elif field_type == 'checkbox':
                # Check various checkbox value formats
                value_str = str(value).lower().strip()
                if any(x in value_str for x in ['yes', '/yes', 'on', '/on', 'true']):
                    display_value = "✓ Yes"
                else:
                    display_value = "☐ No"
            else:
                display_value = str(value)
            
            table_data.append([
                Paragraph(field_name, field_label_style),
                Paragraph(display_value, field_value_style)
            ])
        
        # Only create section if it has data
        if not table_data:
            continue
        
        # Section header with background color
        section_number = section_num + 1
        section_header_table = Table(
            [[Paragraph(f"SECTION {section_number}", section_style)]],
            colWidths=[7.5*inch]
        )
        section_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1a3a52')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(section_header_table)
        elements.append(Spacer(1, 0.1*inch))
        
        # Create section table
        section_table = Table(table_data, colWidths=[2.8*inch, 4.7*inch])
        section_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#ffffff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1a1a1a')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#fafafa'), colors.white])
        ]))
        elements.append(section_table)
        elements.append(Spacer(1, 0.25*inch))
    
    # Add footer
    elements.append(Spacer(1, 0.3*inch))
    footer_line = Table([['_' * 120]], colWidths=[7.5*inch])
    footer_line.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    elements.append(footer_line)
    elements.append(Spacer(1, 0.1*inch))
    
    footer_text = "This document was automatically generated by <b>SpeakEasy</b>. Please review all information for accuracy before submission."
    elements.append(Paragraph(footer_text, ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#888888'),
        alignment=1
    )))
    
    # Build PDF
    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()