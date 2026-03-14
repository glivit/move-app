#!/usr/bin/env python3
"""
MŌVE Progress Report Generator
Generates a premium PDF progress report for a client.
Called from the Next.js API route with JSON data via stdin.
"""

import json
import sys
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Colors ──────────────────────────────────────────────
GOLD = HexColor('#8B6914')
GOLD_LIGHT = HexColor('#F5F0E8')
BG = HexColor('#FAFAFA')
TEXT_PRIMARY = HexColor('#1A1A18')
TEXT_SECONDARY = HexColor('#8E8E93')
TEXT_MUTED = HexColor('#C7C7CC')
BORDER = HexColor('#F0F0ED')
GREEN = HexColor('#34C759')
RED = HexColor('#FF3B30')
BLUE = HexColor('#007AFF')
ORANGE = HexColor('#FF9500')

WIDTH, HEIGHT = A4  # 210mm x 297mm


def draw_header(c, client_name, period_start, period_end, page_num):
    """Draw the MŌVE branded header."""
    # Top gold bar
    c.setFillColor(GOLD)
    c.rect(0, HEIGHT - 28*mm, WIDTH, 28*mm, fill=1, stroke=0)

    # MŌVE logo text — use separate letters to avoid encoding issues
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 22)
    # Draw M, then O with macron as separate element, then VE
    c.drawString(20*mm, HEIGHT - 18*mm, 'M')
    m_width = c.stringWidth('M', 'Helvetica-Bold', 22)
    # Draw O
    c.drawString(20*mm + m_width, HEIGHT - 18*mm, 'O')
    o_width = c.stringWidth('O', 'Helvetica-Bold', 22)
    # Draw macron line over the O
    macron_x = 20*mm + m_width + 1
    macron_w = o_width - 2
    c.setLineWidth(1.5)
    c.setStrokeColor(white)
    c.line(macron_x, HEIGHT - 13.5*mm, macron_x + macron_w, HEIGHT - 13.5*mm)
    # Draw VE
    c.drawString(20*mm + m_width + o_width, HEIGHT - 18*mm, 'VE')

    c.setFont('Helvetica', 9)
    c.drawString(20*mm, HEIGHT - 24*mm, 'Personal Training & Coaching')

    # Date range on right
    c.setFont('Helvetica', 9)
    c.drawRightString(WIDTH - 20*mm, HEIGHT - 18*mm, f'{period_start} — {period_end}')

    # Client name bar
    c.setFillColor(GOLD_LIGHT)
    c.rect(0, HEIGHT - 42*mm, WIDTH, 14*mm, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(20*mm, HEIGHT - 37.5*mm, f'Voortgangsrapport — {client_name}')

    # Page number
    c.setFillColor(TEXT_MUTED)
    c.setFont('Helvetica', 8)
    c.drawRightString(WIDTH - 20*mm, HEIGHT - 37.5*mm, f'Pagina {page_num}')


def draw_footer(c):
    """Draw footer."""
    c.setFillColor(BORDER)
    c.rect(0, 0, WIDTH, 12*mm, fill=1, stroke=0)
    c.setFillColor(TEXT_MUTED)
    c.setFont('Helvetica', 7)
    c.drawString(20*mm, 5*mm, f'MOVE — Gegenereerd op {datetime.now().strftime("%d/%m/%Y om %H:%M")}')
    c.drawRightString(WIDTH - 20*mm, 5*mm, 'Vertrouwelijk')


def draw_section_title(c, y, title, icon_text=''):
    """Draw a section header."""
    c.setFillColor(GOLD)
    c.rect(20*mm, y - 1*mm, 3*mm, 6*mm, fill=1, stroke=0)
    c.setFillColor(TEXT_PRIMARY)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(27*mm, y, title)
    return y - 10*mm


def draw_kpi_card(c, x, y, w, label, value, unit='', delta=None, delta_inverted=False):
    """Draw a KPI card."""
    # Card background
    c.setFillColor(white)
    c.roundRect(x, y, w, 22*mm, 3*mm, fill=1, stroke=0)
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.roundRect(x, y, w, 22*mm, 3*mm, fill=0, stroke=1)

    # Label
    c.setFillColor(TEXT_SECONDARY)
    c.setFont('Helvetica', 8)
    c.drawString(x + 4*mm, y + 16*mm, label.upper())

    # Value
    c.setFillColor(TEXT_PRIMARY)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(x + 4*mm, y + 5*mm, f'{value}{unit}')

    # Delta
    if delta is not None and delta != 0:
        positive = (not delta_inverted and delta > 0) or (delta_inverted and delta < 0)
        color = GREEN if positive else RED
        sign = '+' if delta > 0 else ''
        c.setFillColor(color)
        c.setFont('Helvetica-Bold', 9)
        c.drawRightString(x + w - 4*mm, y + 6*mm, f'{sign}{delta:.1f}{unit}')


def draw_progress_bar(c, x, y, w, pct, color=GOLD):
    """Draw a progress bar."""
    h = 4*mm
    # Background
    c.setFillColor(BORDER)
    c.roundRect(x, y, w, h, 2*mm, fill=1, stroke=0)
    # Fill
    if pct > 0:
        fill_w = max(4*mm, w * min(pct, 100) / 100)
        c.setFillColor(color)
        c.roundRect(x, y, fill_w, h, 2*mm, fill=1, stroke=0)


def draw_table_row(c, y, cols, widths, x_start=20*mm, bold=False, bg=None):
    """Draw a table row."""
    if bg:
        total_w = sum(widths)
        c.setFillColor(bg)
        c.rect(x_start, y - 2*mm, total_w, 8*mm, fill=1, stroke=0)

    x = x_start
    for i, (col, w) in enumerate(zip(cols, widths)):
        c.setFillColor(TEXT_PRIMARY if bold else TEXT_SECONDARY)
        c.setFont('Helvetica-Bold' if bold else 'Helvetica', 8 if not bold else 9)
        text = str(col) if col is not None else '-'
        if i == 0:
            c.drawString(x + 2*mm, y, text)
        else:
            c.drawRightString(x + w - 2*mm, y, text)
        x += w


def generate_report(data, output_path):
    """Generate the full PDF report."""
    c = canvas.Canvas(output_path, pagesize=A4)

    client = data.get('client', {})
    period = data.get('period', {})
    body = data.get('body', {})
    workouts = data.get('workouts', {})
    nutrition = data.get('nutrition', {})
    prs = data.get('prs', [])
    habits = data.get('habits', {})
    feedback = data.get('feedback', [])
    coach_notes = data.get('coach_notes', '')

    client_name = client.get('name', 'Cliënt')
    period_start = period.get('start', '')
    period_end = period.get('end', '')

    # ═══════════════════════════════════════════════════
    # PAGE 1: Overview + Body Composition
    # ═══════════════════════════════════════════════════
    draw_header(c, client_name, period_start, period_end, 1)
    draw_footer(c)

    y = HEIGHT - 52*mm

    # ─── KPI Row ─────────────────────────────────
    card_w = (WIDTH - 40*mm - 9*mm) / 4

    draw_kpi_card(c, 20*mm, y - 22*mm, card_w,
        'Gewicht', f"{body.get('current_weight', '-')}", ' kg',
        body.get('weight_delta'))

    draw_kpi_card(c, 20*mm + card_w + 3*mm, y - 22*mm, card_w,
        'Vetpercentage', f"{body.get('current_bf', '-')}", '%',
        body.get('bf_delta'), delta_inverted=True)

    draw_kpi_card(c, 20*mm + 2*(card_w + 3*mm), y - 22*mm, card_w,
        'Trainingen', f"{workouts.get('total_sessions', 0)}", '',
        None)

    draw_kpi_card(c, 20*mm + 3*(card_w + 3*mm), y - 22*mm, card_w,
        'Compliance', f"{workouts.get('compliance_pct', 0)}", '%',
        None)

    y -= 30*mm

    # ─── Body Composition Section ─────────────────
    y = draw_section_title(c, y, 'Lichaamssamenstelling')

    measurements = body.get('measurements', [])
    if measurements:
        col_widths = [35*mm, 25*mm, 25*mm, 25*mm, 25*mm]
        draw_table_row(c, y, ['Datum', 'Gewicht', 'Vetpct', 'Spiermassa', 'Taille'],
                      col_widths, bold=True, bg=GOLD_LIGHT)
        y -= 8*mm

        for m in measurements[-8:]:  # Last 8 check-ins
            draw_table_row(c, y, [
                m.get('date', ''),
                f"{m.get('weight', '-')} kg",
                f"{m.get('body_fat', '-')}%",
                f"{m.get('muscle', '-')} kg" if m.get('muscle') else '-',
                f"{m.get('waist', '-')} cm" if m.get('waist') else '-',
            ], col_widths)
            y -= 7*mm

    y -= 5*mm

    # ─── Workout Summary ─────────────────────────
    y = draw_section_title(c, y, 'Training overzicht')

    # Workout stats
    c.setFillColor(white)
    c.roundRect(20*mm, y - 30*mm, WIDTH - 40*mm, 28*mm, 3*mm, fill=1, stroke=0)
    c.setStrokeColor(BORDER)
    c.roundRect(20*mm, y - 30*mm, WIDTH - 40*mm, 28*mm, 3*mm, fill=0, stroke=1)

    stats = [
        ('Sessies', str(workouts.get('total_sessions', 0))),
        ('Totaal volume', f"{workouts.get('total_volume', 0):,.0f} kg"),
        ('Gem. duur', f"{workouts.get('avg_duration_min', 0):.0f} min"),
        ('PRs behaald', str(workouts.get('total_prs', 0))),
    ]

    stat_w = (WIDTH - 40*mm) / len(stats)
    for i, (label, val) in enumerate(stats):
        sx = 20*mm + i * stat_w
        c.setFillColor(TEXT_SECONDARY)
        c.setFont('Helvetica', 8)
        c.drawCentredString(sx + stat_w/2, y - 10*mm, label.upper())
        c.setFillColor(TEXT_PRIMARY)
        c.setFont('Helvetica-Bold', 14)
        c.drawCentredString(sx + stat_w/2, y - 22*mm, val)

        # Separator
        if i < len(stats) - 1:
            c.setStrokeColor(BORDER)
            c.line(sx + stat_w, y - 5*mm, sx + stat_w, y - 28*mm)

    y -= 38*mm

    # ─── Weekly Volume ───────────────────────────
    weekly = workouts.get('weekly_volume', [])
    if weekly:
        y = draw_section_title(c, y, 'Volume per week')

        chart_w = WIDTH - 40*mm
        chart_h = 30*mm
        max_vol = max(w.get('volume', 1) for w in weekly) * 1.1
        bar_w = min(12*mm, (chart_w - 5*mm) / max(len(weekly), 1))
        gap = (chart_w - bar_w * len(weekly)) / max(len(weekly) + 1, 1)

        for i, w in enumerate(weekly):
            vol = w.get('volume', 0)
            bar_h = (vol / max_vol) * chart_h if max_vol > 0 else 0
            bx = 20*mm + gap + i * (bar_w + gap)

            # Bar
            c.setFillColor(GOLD)
            c.roundRect(bx, y - chart_h, bar_w, bar_h, 1.5*mm, fill=1, stroke=0)

            # Label
            c.setFillColor(TEXT_MUTED)
            c.setFont('Helvetica', 6)
            c.drawCentredString(bx + bar_w/2, y - chart_h - 5*mm, w.get('week', ''))

        y -= chart_h + 12*mm

    # ─── PRs ─────────────────────────────────────
    if prs:
        if y < 60*mm:
            c.showPage()
            draw_header(c, client_name, period_start, period_end, 2)
            draw_footer(c)
            y = HEIGHT - 52*mm

        y = draw_section_title(c, y, f'Persoonlijke Records ({len(prs)})')

        col_widths = [55*mm, 30*mm, 30*mm, 30*mm]
        draw_table_row(c, y, ['Oefening', 'Gewicht', 'Reps', 'Datum'],
                      col_widths, bold=True, bg=GOLD_LIGHT)
        y -= 8*mm

        for pr in prs[:10]:
            draw_table_row(c, y, [
                pr.get('exercise', ''),
                f"{pr.get('weight', '-')} kg",
                str(pr.get('reps', '-')),
                pr.get('date', ''),
            ], col_widths)
            y -= 7*mm

    # ═══════════════════════════════════════════════════
    # PAGE 2: Nutrition + Habits + Coach Notes
    # ═══════════════════════════════════════════════════
    c.showPage()
    draw_header(c, client_name, period_start, period_end, 2)
    draw_footer(c)
    y = HEIGHT - 52*mm

    # ─── Nutrition ───────────────────────────────
    if nutrition:
        y = draw_section_title(c, y, 'Voeding')

        macro_data = [
            ('Calorieën', nutrition.get('avg_calories', 0), nutrition.get('target_calories', 0), 'kcal'),
            ('Eiwit', nutrition.get('avg_protein', 0), nutrition.get('target_protein', 0), 'g'),
            ('Koolhydraten', nutrition.get('avg_carbs', 0), nutrition.get('target_carbs', 0), 'g'),
            ('Vetten', nutrition.get('avg_fat', 0), nutrition.get('target_fat', 0), 'g'),
        ]

        for label, actual, target, unit in macro_data:
            pct = (actual / target * 100) if target > 0 else 0

            c.setFillColor(TEXT_PRIMARY)
            c.setFont('Helvetica', 9)
            c.drawString(20*mm, y, label)

            c.setFillColor(TEXT_SECONDARY)
            c.setFont('Helvetica', 8)
            c.drawRightString(WIDTH - 20*mm, y, f'{actual:.0f} / {target:.0f} {unit} ({pct:.0f}%)')

            y -= 3*mm
            bar_color = GREEN if 85 <= pct <= 115 else (ORANGE if 70 <= pct <= 130 else RED)
            draw_progress_bar(c, 20*mm, y - 4*mm, WIDTH - 40*mm, pct, bar_color)
            y -= 10*mm

        # Meal compliance
        meal_compliance = nutrition.get('meal_compliance_pct', 0)
        c.setFillColor(TEXT_PRIMARY)
        c.setFont('Helvetica', 9)
        c.drawString(20*mm, y, f'Maaltijd compliance: {meal_compliance:.0f}%')
        y -= 12*mm

    # ─── Habits ──────────────────────────────────
    habit_list = habits.get('list', [])
    if habit_list:
        y = draw_section_title(c, y, 'Gewoontes')

        for h in habit_list:
            name = h.get('name', '')
            streak = h.get('streak', 0)
            completion_pct = h.get('completion_pct', 0)

            c.setFillColor(TEXT_PRIMARY)
            c.setFont('Helvetica', 9)
            c.drawString(20*mm, y, f'{h.get("icon", "✅")} {name}')

            c.setFillColor(TEXT_SECONDARY)
            c.setFont('Helvetica', 8)
            streak_text = f'{streak}d streak — {completion_pct:.0f}% compliance'
            c.drawRightString(WIDTH - 20*mm, y, streak_text)

            y -= 3*mm
            draw_progress_bar(c, 20*mm, y - 4*mm, WIDTH - 40*mm, completion_pct, GOLD)
            y -= 10*mm

    # ─── Feedback Summary ────────────────────────
    if feedback:
        y -= 3*mm
        y = draw_section_title(c, y, 'Workout Feedback')

        difficulty_labels = {1: 'Te makkelijk', 2: 'Makkelijk', 3: 'Perfect', 4: 'Zwaar', 5: 'Te zwaar'}
        difficulty_colors = {1: BLUE, 2: GREEN, 3: GOLD, 4: ORANGE, 5: RED}

        for fb in feedback[:5]:
            diff = fb.get('difficulty_rating')
            mood = fb.get('mood_rating')
            text = fb.get('feedback_text', '')
            date = fb.get('date', '')

            c.setFillColor(TEXT_MUTED)
            c.setFont('Helvetica', 7)
            c.drawString(20*mm, y, date)

            if diff:
                c.setFillColor(difficulty_colors.get(diff, TEXT_SECONDARY))
                c.setFont('Helvetica-Bold', 8)
                c.drawString(45*mm, y, difficulty_labels.get(diff, ''))

            if mood:
                mood_emojis = {1: 'Verschrikkelijk', 2: 'Matig', 3: 'Goed', 4: 'Sterk', 5: 'Geweldig'}
                c.setFillColor(TEXT_SECONDARY)
                c.setFont('Helvetica', 8)
                c.drawString(80*mm, y, f'Gevoel: {mood_emojis.get(mood, "")}')

            if text:
                y -= 5*mm
                c.setFillColor(TEXT_SECONDARY)
                c.setFont('Helvetica', 8)
                # Truncate long text
                display_text = text[:80] + ('...' if len(text) > 80 else '')
                c.drawString(25*mm, y, f'"{display_text}"')

            y -= 8*mm

    # ─── Coach Notes ─────────────────────────────
    if coach_notes:
        if y < 60*mm:
            c.showPage()
            draw_header(c, client_name, period_start, period_end, 3)
            draw_footer(c)
            y = HEIGHT - 52*mm

        y -= 5*mm
        y = draw_section_title(c, y, 'Notities van je coach')

        # Note box
        c.setFillColor(GOLD_LIGHT)
        # Calculate height based on text length
        note_lines = coach_notes.split('\n')
        box_h = max(15*mm, len(note_lines) * 5*mm + 8*mm)
        c.roundRect(20*mm, y - box_h, WIDTH - 40*mm, box_h, 3*mm, fill=1, stroke=0)

        c.setFillColor(TEXT_PRIMARY)
        c.setFont('Helvetica', 9)
        ty = y - 6*mm
        for line in note_lines:
            if ty < 20*mm:
                break
            # Word wrap at ~80 chars
            while len(line) > 80:
                c.drawString(24*mm, ty, line[:80])
                line = line[80:]
                ty -= 4.5*mm
            c.drawString(24*mm, ty, line)
            ty -= 4.5*mm

    c.save()
    return output_path


if __name__ == '__main__':
    # Read JSON data from stdin
    input_data = json.load(sys.stdin)
    output_path = input_data.get('output_path', '/tmp/report.pdf')

    generate_report(input_data, output_path)
    print(json.dumps({'success': True, 'path': output_path}))
