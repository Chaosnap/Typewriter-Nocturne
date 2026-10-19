#!/usr/bin/env python3
"""Generate the theme preview SVGs in this directory.

Original vector artwork for Typewriter Nocturne (MIT). Colours mirror the design tokens in
app/nocturne/themes.ts and the layout mirrors the app: toolbar, paper sheet with the terminal
grid, carriage rail with the brass type guide under the current line, the theme's light, and the
status bar with the column scale. Ink density varies per character like a typewriter ribbon.
Run with plain Python 3 (no dependencies); CI renders the SVGs to PNG.
"""
import html
import pathlib
import random

HERE = pathlib.Path(__file__).resolve().parent

THEMES = {
    'paper-and-ink': dict(
        name='Paper & Ink', room='#2a1f18', room_edge='#0f0a07', paper='#f4ecdb', paper_edge='#e1d1b0',
        ink='#2b231c', muted='#6e6153', faint='#a89a85', accent='#b08a4a', light='#ffd79a',
        metal='#b8904c', metal_hi='#f3dca4', metal_lo='#5e431c', ribbon='#8e2f25',
        red='#9c3a2a', green='#4c6b2f', yellow='#8a6a1c', blue='#2f5277', magenta='#7b3f6e', cyan='#2e6b6a',
        light_kind='carriage', dark=False),
    'midnight-study': dict(
        name='Midnight Study', room='#0d0a08', room_edge='#020101', paper='#1c1714', paper_edge='#2c241e',
        ink='#eadfc8', muted='#a39580', faint='#6b5f52', accent='#c9a45c', light='#ffb35c',
        metal='#c9a45c', metal_hi='#f4dca0', metal_lo='#4f3a17', ribbon='#7a2a20',
        red='#d2765c', green='#a3b46a', yellow='#e3b25c', blue='#7f9fc2', magenta='#c48aa8', cyan='#7fb3a8',
        light_kind='lamp', dark=True),
    'moonlit-poetry': dict(
        name='Moonlit Poetry', room='#0b0b14', room_edge='#030307', paper='#171826', paper_edge='#26283e',
        ink='#dcdcec', muted='#9496b4', faint='#5c5e7c', accent='#b7bdd6', light='#cdd6ff',
        metal='#aeb4c8', metal_hi='#eef0fa', metal_lo='#3e4258', ribbon='#4a3f7a',
        red='#d88a9a', green='#9cc3a4', yellow='#e2cf9a', blue='#8ea8e0', magenta='#b79ce0', cyan='#8cc8d6',
        light_kind='moon', dark=True),
}

W, H = 1200, 760
SHEET = dict(x=72, y=78, w=1056, h=600)
CELL_W, CELL_H = 11.4, 25.0
GRID_X, GRID_Y = SHEET['x'] + 42, SHEET['y'] + 46
MONO = "'Courier Prime', 'Courier New', 'Nimbus Mono PS', 'DejaVu Sans Mono', monospace"
SERIF = "'EB Garamond', 'Iowan Old Style', 'Palatino', Georgia, 'DejaVu Serif', serif"


def lines_for(t):
    """Terminal transcript: (segments of (text, colour key)) per row."""
    return [
        [('~/manuscripts', 'accent'), (' on ', 'muted'), ('main', 'magenta'), (' ✎', 'muted')],
        [('$ ', 'muted'), ('git status --short', 'ink')],
        [(' M ', 'green'), ('chapter-01.md', 'ink')],
        [('?? ', 'red'), ('sonnet-18.txt', 'ink')],
        [('$ ', 'muted'), ('python3 -c "print(\'Shall I compare thee\')"', 'ink')],
        [('Shall I compare thee', 'ink')],
        [('$ ', 'muted'), ('ls', 'ink')],
        [('drafts/', 'blue'), ('   ', 'ink'), ('notes.md', 'cyan'), ('   ', 'ink'), ('纸与墨.txt', 'yellow')],
        [('$ ', 'muted'), ('echo "Every line of code, a line of verse."', 'ink')],
        [('Every line of code, a line of verse.', 'ink')],
        [('$ ', 'muted'), ('npm test', 'ink')],
        [('  ✓ ', 'green'), ('42 passing', 'ink'), (' (318ms)', 'muted')],
        [('$ ', 'muted'), ('git commit -m "Sonnet XVIII', 'ink')],
    ]


def cell_width(ch):
    return 2 if ord(ch) > 0x2E80 else 1


def ink_text(t, rng):
    """Per-character tspans with uneven ribbon density."""
    out = []
    for row, segments in enumerate(lines_for(t)):
        col = 0
        y = GRID_Y + row * CELL_H + CELL_H * 0.72
        for text, key in segments:
            colour = t[key]
            for ch in text:
                if ch != ' ':
                    density = 0.74 + 0.26 * rng.random() if not t['dark'] else 0.86 + 0.14 * rng.random()
                    dx = (rng.random() - 0.5) * 0.5
                    dy = (rng.random() - 0.5) * 0.6
                    x = GRID_X + col * CELL_W + dx
                    out.append(
                        f'<text x="{x:.2f}" y="{y + dy:.2f}" fill="{colour}" fill-opacity="{density:.2f}">'
                        f'{html.escape(ch)}</text>')
                col += cell_width(ch)
    return '\n      '.join(out)


def cursor_row(t):
    return len(lines_for(t)) - 1


def cursor_col(t):
    return sum(len(text) for text, _ in lines_for(t)[-1])


def light_layer(t):
    rail_y = GRID_Y + (cursor_row(t) + 1) * CELL_H + 2
    head_x = GRID_X + cursor_col(t) * CELL_W + CELL_W / 2
    if t['light_kind'] == 'carriage':
        # Carriage lamp: a beam that widens up the page from the type guide, in a dim room.
        return f'''<rect x="{SHEET["x"]}" y="{SHEET["y"]}" width="{SHEET["w"]}" height="{SHEET["h"]}" fill="url(#vignette)" opacity="0.75"/>
    <path d="M{head_x - 10} {rail_y} L{head_x + 10} {rail_y} L{head_x + 300} {SHEET["y"] - 40} L{head_x - 300} {SHEET["y"] - 40} Z"
      fill="url(#beam)"/>
    <ellipse cx="{head_x}" cy="{rail_y - 40}" rx="230" ry="150" fill="url(#pool)"/>'''
    if t['light_kind'] == 'lamp':
        return f'''<ellipse cx="{SHEET["x"] + SHEET["w"] * 0.78}" cy="{SHEET["y"] + 40}" rx="620" ry="420" fill="url(#pool)"/>
    <rect x="{SHEET["x"]}" y="{SHEET["y"]}" width="{SHEET["w"]}" height="{SHEET["h"]}" fill="url(#vignette)"/>'''
    panes = []
    for i in range(3):
        for j in range(2):
            x = SHEET['x'] + 250 + i * 150 + j * 70
            y = SHEET['y'] + 70 + j * 160
            panes.append(f'<path d="M{x} {y} l132 0 l70 150 l-132 0 Z" fill="url(#moonpane)"/>')
    motes = ''.join(
        f'<circle cx="{SHEET["x"] + 260 + (k * 97) % 560}" cy="{SHEET["y"] + 80 + (k * 53) % 330}" r="{1 + (k % 3) * 0.5}"'
        f' fill="#e6e8ff" fill-opacity="{0.25 + (k % 4) * 0.12:.2f}"/>' for k in range(18))
    return '\n    '.join(panes) + f'\n    <rect x="{SHEET["x"]}" y="{SHEET["y"]}" width="{SHEET["w"]}" height="{SHEET["h"]}" fill="url(#vignette)"/>\n    ' + motes


def carriage(t):
    rail_y = GRID_Y + (cursor_row(t) + 1) * CELL_H + 2
    head_x = GRID_X + cursor_col(t) * CELL_W + CELL_W / 2
    x0, x1 = SHEET['x'] + 18, SHEET['x'] + SHEET['w'] - 18
    return f'''<g>
      <rect x="{x0}" y="{rail_y - 2}" width="{x1 - x0}" height="5" rx="2.5" fill="url(#rail)"/>
      <ellipse cx="{head_x + 4}" cy="{rail_y + 9}" rx="26" ry="4" fill="#000" fill-opacity="0.28" filter="url(#blur3)"/>
      <rect x="{head_x - 20}" y="{rail_y - 6}" width="40" height="13" rx="5" fill="url(#head)" stroke="{t["metal_lo"]}" stroke-opacity="0.6"/>
      <circle cx="{head_x - 11}" cy="{rail_y + 0.5}" r="1.8" fill="{t["metal_lo"]}"/>
      <circle cx="{head_x + 11}" cy="{rail_y + 0.5}" r="1.8" fill="{t["metal_lo"]}"/>
      <path d="M{head_x - 4} {rail_y - 6} L{head_x + 4} {rail_y - 6} L{head_x} {rail_y - 14} Z" fill="url(#head)"/>
      <rect x="{head_x - 6}" y="{rail_y + 4}" width="12" height="2" fill="{t["ribbon"]}"/>
      <rect x="{GRID_X + cursor_col(t) * CELL_W}" y="{rail_y - CELL_H + 1}" width="{CELL_W}" height="{CELL_H - 6}" fill="{t["ink"]}" fill-opacity="0.85"/>
    </g>'''


def toolbar(t):
    icons = []
    x = W - 36
    for kind in ('focus', 'bell', 'type', 'lamp'):
        stroke = t['accent']
        if kind == 'lamp':
            body = f'<path d="M-6 4 L6 4 L3 -4 L-3 -4 Z M0 4 L0 9 M-5 9 L5 9" fill="none" stroke="{stroke}" stroke-width="1.4"/>'
        elif kind == 'type':
            body = f'<text x="0" y="5" text-anchor="middle" font-family="{SERIF}" font-size="15" fill="{stroke}">Aa</text>'
        elif kind == 'bell':
            body = f'<path d="M-6 5 Q-6 -6 0 -6 Q6 -6 6 5 Z M-8 5 L8 5 M-1.5 8 L1.5 8" fill="none" stroke="{stroke}" stroke-width="1.4"/>'
        else:
            body = f'<path d="M-7 -3 L-7 -7 L-3 -7 M3 -7 L7 -7 L7 -3 M7 3 L7 7 L3 7 M-3 7 L-7 7 L-7 3" fill="none" stroke="{stroke}" stroke-width="1.4"/>'
        icons.append(f'<g transform="translate({x} 38)">{body}</g>')
        x -= 34
    return '\n  '.join(icons)


def status_bar(t):
    y = SHEET['y'] + SHEET['h'] + 34
    ticks = []
    scale_x0 = 380
    for c in range(0, 81):
        major = c % 10 == 0
        h = 7 if major else (4 if c % 5 == 0 else 2.5)
        x = scale_x0 + c * 5.2
        ticks.append(f'<line x1="{x:.1f}" y1="{y - 12}" x2="{x:.1f}" y2="{y - 12 + h}" stroke="{t["muted"]}" stroke-opacity="0.7"/>')
        if major:
            ticks.append(f'<text x="{x:.1f}" y="{y + 6}" text-anchor="middle" font-family="{MONO}" font-size="9" fill="{t["muted"]}">{c}</text>')
    marker = scale_x0 + cursor_col(t) * 5.2
    return f'''<text x="{SHEET["x"]}" y="{y}" font-family="{SERIF}" font-size="16" font-style="italic" fill="{t["muted"]}">Chapter I · zsh</text>
  {''.join(ticks)}
  <path d="M{marker - 4} {y - 18} L{marker + 4} {y - 18} L{marker} {y - 12} Z" fill="{t["accent"]}"/>
  <text x="{SHEET["x"] + SHEET["w"]}" y="{y}" text-anchor="end" font-family="{SERIF}" font-size="15" fill="{t["muted"]}">80 × 24 · UTF-8 · ♪</text>'''


def svg(slug, t):
    rng = random.Random(slug)
    grain = 'multiply' if not t['dark'] else 'screen'
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- Typewriter Nocturne · {html.escape(t["name"])} · design preview. Original artwork (MIT), generated by make_thumbnails.py -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <radialGradient id="room" cx="55%" cy="30%" r="85%">
      <stop offset="0" stop-color="{t["room"]}"/>
      <stop offset="1" stop-color="{t["room_edge"]}"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="{t["light"]}" stop-opacity="0.62"/>
      <stop offset="0.55" stop-color="{t["light"]}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="{t["light"]}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="pool" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="{t["light"]}" stop-opacity="{0.55 if not t["dark"] else 0.3}"/>
      <stop offset="0.6" stop-color="{t["light"]}" stop-opacity="{0.12 if not t["dark"] else 0.08}"/>
      <stop offset="1" stop-color="{t["light"]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="55%" cy="40%" r="75%">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <linearGradient id="moonpane" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{t["light"]}" stop-opacity="0.2"/>
      <stop offset="1" stop-color="{t["light"]}" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{t["metal_hi"]}"/>
      <stop offset="0.45" stop-color="{t["metal"]}"/>
      <stop offset="1" stop-color="{t["metal_lo"]}"/>
    </linearGradient>
    <linearGradient id="head" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="{t["metal_hi"]}"/>
      <stop offset="0.5" stop-color="{t["metal"]}"/>
      <stop offset="1" stop-color="{t["metal_lo"]}"/>
    </linearGradient>
    <filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="ink" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="bled"/>
      <feGaussianBlur in="bled" stdDeviation="0.18"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.9 -0.35"/>
    </filter>
    <clipPath id="sheet"><rect x="{SHEET["x"]}" y="{SHEET["y"]}" width="{SHEET["w"]}" height="{SHEET["h"]}" rx="8"/></clipPath>
  </defs>

  <rect width="{W}" height="{H}" rx="20" fill="url(#room)"/>

  <!-- toolbar -->
  <circle cx="36" cy="38" r="7" fill="#d9614e"/><circle cx="60" cy="38" r="7" fill="#e0b04a"/>
  <circle cx="84" cy="38" r="7" fill="#79a85a"/>
  <text x="{W / 2}" y="44" text-anchor="middle" font-family="{SERIF}" font-size="17" letter-spacing="3.2"
    fill="{t["accent"]}">TYPEWRITER NOCTURNE</text>
  <text x="{W / 2}" y="64" text-anchor="middle" font-family="{SERIF}" font-size="13" font-style="italic"
    fill="{t["muted"]}">{html.escape(t["name"])} · ~/manuscripts</text>
  {toolbar(t)}

  <!-- the sheet -->
  <rect x="{SHEET["x"] + 6}" y="{SHEET["y"] + 14}" width="{SHEET["w"]}" height="{SHEET["h"]}" rx="8" fill="#000" fill-opacity="0.6" filter="url(#shadow)"/>
  <rect x="{SHEET["x"]}" y="{SHEET["y"]}" width="{SHEET["w"]}" height="{SHEET["h"]}" rx="8" fill="{t["paper"]}" stroke="{t["paper_edge"]}"/>
  <g clip-path="url(#sheet)">
    <rect x="{SHEET["x"]}" y="{SHEET["y"]}" width="{SHEET["w"]}" height="{SHEET["h"]}" filter="url(#grain)" opacity="{0.22 if not t["dark"] else 0.08}" style="mix-blend-mode:{grain}"/>
    {light_layer(t)}
    <g font-family="{MONO}" font-size="19" filter="url(#ink)">
      {ink_text(t, rng)}
    </g>
    {carriage(t)}
  </g>

  <!-- status bar with the column scale -->
  {status_bar(t)}
</svg>
'''


for slug, theme in THEMES.items():
    (HERE / f'{slug}.svg').write_text(svg(slug, theme), encoding='utf-8')
    print('wrote', slug)
