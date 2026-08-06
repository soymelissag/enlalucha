#!/usr/bin/env python3
"""
Placeholder asset generator for the Scene Builder.

Everything the app renders is a flat image. The real project will replace
these with illustrated PNGs, but they are drawn here as self-contained SVGs
so the app is demonstrable with zero external art.

THE ONE RULE THAT MATTERS (see the build spec, "Registration frame"):
every character layer — body, outfit, face, accessory — is emitted on the
SAME 800x1200 artboard with the figure in the SAME place and transparency
everywhere else. Stacking them at the same x/y/size then lines up by
construction, with no per-combination pixel nudging.

Run:  python3 tools/gen_assets.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Character registration frame. Every abuela layer uses exactly this.
CW, CH = 800, 1200
# Head is kept in a FIXED position across all three poses (the design
# constraint the spec calls out), so a face lines up on stand/yell/run alike.
HEAD_CX, HEAD_CY, HEAD_R = 400, 300, 130

# Background frame: 4:3, sized for 2x export.
BW, BH = 2048, 1536


def write(path, body):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(body)
    return path


def svg(w, h, inner):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}">{inner}</svg>'
    )


# ---------------------------------------------------------------------------
# Backgrounds
# ---------------------------------------------------------------------------
def bg_beach():
    return svg(BW, BH, f'''
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#dff3ff"/>
      </linearGradient></defs>
      <rect width="{BW}" height="{BH}" fill="url(#sky)"/>
      <circle cx="360" cy="300" r="130" fill="#fff3b0"/>
      <rect y="{BH*0.62:.0f}" width="{BW}" height="{BH*0.14:.0f}" fill="#3aa0d6"/>
      <rect y="{BH*0.74:.0f}" width="{BW}" height="{BH*0.26:.0f}" fill="#efd9a0"/>
      <path d="M0 {BH*0.74:.0f} Q {BW*0.5:.0f} {BH*0.70:.0f} {BW} {BH*0.74:.0f} L {BW} {BH*0.80:.0f} L 0 {BH*0.80:.0f} Z" fill="#f6ead0"/>
    ''')


def bg_home():
    return svg(BW, BH, f'''
      <rect width="{BW}" height="{BH}" fill="#e9ddc9"/>
      <rect y="{BH*0.70:.0f}" width="{BW}" height="{BH*0.30:.0f}" fill="#b98a5e"/>
      <rect x="{BW*0.62:.0f}" y="{BH*0.18:.0f}" width="{BW*0.26:.0f}" height="{BH*0.40:.0f}" rx="12" fill="#bfe3f2" stroke="#8a6a4a" stroke-width="18"/>
      <line x1="{BW*0.75:.0f}" y1="{BH*0.18:.0f}" x2="{BW*0.75:.0f}" y2="{BH*0.58:.0f}" stroke="#8a6a4a" stroke-width="12"/>
      <rect x="{BW*0.08:.0f}" y="{BH*0.40:.0f}" width="{BW*0.30:.0f}" height="{BH*0.30:.0f}" rx="16" fill="#c9553f"/>
      <rect x="{BW*0.10:.0f}" y="{BH*0.44:.0f}" width="{BW*0.26:.0f}" height="{BH*0.10:.0f}" rx="8" fill="#e0806e"/>
    ''')


def bg_fiesta():
    bunting = ""
    colors = ["#e94f5e", "#f4b63f", "#4aa96c", "#4f7fd6", "#9b5de5"]
    n = 14
    for i in range(n):
        x = BW * i / (n - 1)
        c = colors[i % len(colors)]
        dip = 120 + 40 * (0.5 - abs(i / (n - 1) - 0.5))
        bunting += f'<path d="M{x:.0f} 40 L{x+BW/(n-1)/2:.0f} {dip:.0f} L{x+BW/(n-1):.0f} 40 Z" fill="{c}"/>'
    return svg(BW, BH, f'''
      <defs><linearGradient id="fs" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a2a5a"/><stop offset="1" stop-color="#7a4fa0"/>
      </linearGradient></defs>
      <rect width="{BW}" height="{BH}" fill="url(#fs)"/>
      {"".join(f'<circle cx="{(i*137)%BW}" cy="{(i*89)%int(BH*0.6)}" r="4" fill="#ffe9a8"/>' for i in range(60))}
      <line x1="0" y1="40" x2="{BW}" y2="40" stroke="#ffe9a8" stroke-width="6"/>
      {bunting}
      <rect y="{BH*0.82:.0f}" width="{BW}" height="{BH*0.18:.0f}" fill="#2c1f45"/>
    ''')


# ---------------------------------------------------------------------------
# Props (square, ~12% transparent padding so scaling never clips)
# ---------------------------------------------------------------------------
PS = 512


def prop(inner):
    return svg(PS, PS, inner)


PROPS = {
    "chancla": prop('<g transform="rotate(-18 256 256)"><ellipse cx="256" cy="300" rx="120" ry="180" fill="#7a4a2b"/><ellipse cx="256" cy="300" rx="92" ry="150" fill="#a86a3d"/><path d="M256 170 Q200 240 210 250 M256 170 Q312 240 302 250" stroke="#3c2413" stroke-width="26" fill="none" stroke-linecap="round"/></g>'),
    "cactus": prop('<g fill="#4aa96c" stroke="#2f7d4c" stroke-width="10"><rect x="216" y="150" width="80" height="260" rx="40"/><rect x="120" y="230" width="70" height="120" rx="35"/><rect x="322" y="200" width="70" height="150" rx="35"/></g><rect x="196" y="400" width="120" height="70" rx="10" fill="#c9553f"/>'),
    "planta": prop('<path d="M256 420 C120 380 130 200 256 200 C382 200 392 380 256 420" fill="#4aa96c"/><path d="M256 400 C180 360 200 240 256 220 C312 240 332 360 256 400" fill="#5cc07d"/><rect x="196" y="400" width="120" height="70" rx="12" fill="#b26a3d"/>'),
    "tele": prop('<rect x="120" y="150" width="272" height="200" rx="16" fill="#3a3a44"/><rect x="140" y="170" width="232" height="160" rx="8" fill="#9fd7e6"/><rect x="200" y="350" width="112" height="34" rx="8" fill="#2a2a32"/><rect x="176" y="384" width="160" height="20" rx="10" fill="#2a2a32"/>'),
    "radio": prop('<rect x="130" y="190" width="252" height="150" rx="14" fill="#6a5140"/><circle cx="315" cy="265" r="46" fill="#d9c7a3"/><circle cx="315" cy="265" r="20" fill="#4a3626"/><rect x="160" y="220" width="90" height="90" rx="8" fill="#3a2c1e"/><line x1="360" y1="190" x2="410" y2="120" stroke="#4a3626" stroke-width="10"/>'),
    "cafe": prop('<path d="M170 210 h150 v90 a75 75 0 0 1 -150 0 Z" fill="#efe7d8"/><path d="M320 230 a45 45 0 0 1 0 70" fill="none" stroke="#efe7d8" stroke-width="18"/><rect x="170" y="200" width="150" height="18" rx="9" fill="#c9553f"/><path d="M215 175 q-14 -24 0 -46 M255 175 q-14 -24 0 -46" stroke="#cbb8a0" stroke-width="9" fill="none"/>'),
    "perro": prop('<ellipse cx="256" cy="320" rx="140" ry="80" fill="#b98a5e"/><circle cx="150" cy="270" r="70" fill="#b98a5e"/><ellipse cx="120" cy="230" rx="26" ry="44" fill="#8a6444"/><circle cx="128" cy="262" r="9" fill="#2a2018"/><circle cx="120" cy="292" r="12" fill="#2a2018"/><rect x="360" y="240" width="18" height="80" rx="9" fill="#8a6444"/>'),
    "olla": prop('<ellipse cx="256" cy="330" rx="130" ry="30" fill="#555"/><path d="M126 250 h260 v50 a130 30 0 0 1 -260 0 Z" fill="#777"/><rect x="126" y="230" width="260" height="26" rx="13" fill="#999"/><rect x="90" y="234" width="40" height="18" rx="9" fill="#666"/><rect x="382" y="234" width="40" height="18" rx="9" fill="#666"/>'),
    "bandera": prop('<line x1="180" y1="130" x2="180" y2="400" stroke="#7a5a3a" stroke-width="14"/><path d="M187 140 h180 l-30 40 l30 40 h-180 Z" fill="#e94f5e"/><circle cx="180" cy="126" r="14" fill="#f4b63f"/>'),
}


# ---------------------------------------------------------------------------
# Abuela character layers. All on the 800x1200 registration frame.
# ---------------------------------------------------------------------------
SKIN = "#e3b58f"
SKIN_DK = "#c99570"
HAIR = "#d8d8de"
HAIR_DK = "#b9b9c2"

# Per-pose limb + torso geometry. Head stays fixed (HEAD_CX/HEAD_CY).
POSES = {
    "stand": dict(lean=0),
    "yell":  dict(lean=-6),
    "run":   dict(lean=10),
}


def torso_path(pose):
    """Dress/torso silhouette used by outfits (varies subtly by pose)."""
    if pose == "run":
        return "M300 440 L500 440 L560 900 L470 940 L330 900 Z"
    if pose == "yell":
        return "M300 440 L500 440 L540 900 L400 930 L260 900 Z"
    return "M300 440 L500 440 L530 910 L270 910 Z"


def arms(pose, color):
    """Arm shapes, colored to the outfit sleeve; hands are skin."""
    if pose == "yell":
        return (
            f'<path d="M310 470 Q210 420 250 300" stroke="{color}" stroke-width="52" fill="none" stroke-linecap="round"/>'
            f'<circle cx="250" cy="290" r="34" fill="{SKIN}"/>'
            f'<path d="M490 470 Q600 470 610 590" stroke="{color}" stroke-width="52" fill="none" stroke-linecap="round"/>'
            f'<circle cx="612" cy="600" r="34" fill="{SKIN}"/>'
        )
    if pose == "run":
        return (
            f'<path d="M320 470 Q230 520 250 620" stroke="{color}" stroke-width="52" fill="none" stroke-linecap="round"/>'
            f'<circle cx="252" cy="628" r="34" fill="{SKIN}"/>'
            f'<path d="M500 470 Q600 500 590 400" stroke="{color}" stroke-width="52" fill="none" stroke-linecap="round"/>'
            f'<circle cx="590" cy="392" r="34" fill="{SKIN}"/>'
        )
    return (
        f'<path d="M312 470 Q250 640 300 760" stroke="{color}" stroke-width="52" fill="none" stroke-linecap="round"/>'
        f'<circle cx="304" cy="770" r="34" fill="{SKIN}"/>'
        f'<path d="M488 470 Q550 640 500 760" stroke="{color}" stroke-width="52" fill="none" stroke-linecap="round"/>'
        f'<circle cx="496" cy="770" r="34" fill="{SKIN}"/>'
    )


def legs(pose):
    if pose == "run":
        return (
            f'<path d="M350 900 Q300 1020 250 1120" stroke="{SKIN_DK}" stroke-width="56" fill="none" stroke-linecap="round"/>'
            f'<path d="M450 900 Q520 1000 560 1060" stroke="{SKIN_DK}" stroke-width="56" fill="none" stroke-linecap="round"/>'
            f'<ellipse cx="235" cy="1135" rx="52" ry="24" fill="#5a4634"/>'
            f'<ellipse cx="580" cy="1070" rx="52" ry="24" fill="#5a4634" transform="rotate(30 580 1070)"/>'
        )
    if pose == "yell":
        return (
            f'<path d="M360 900 L340 1120" stroke="{SKIN_DK}" stroke-width="56" fill="none" stroke-linecap="round"/>'
            f'<path d="M440 900 L470 1120" stroke="{SKIN_DK}" stroke-width="56" fill="none" stroke-linecap="round"/>'
            f'<ellipse cx="330" cy="1140" rx="54" ry="24" fill="#5a4634"/>'
            f'<ellipse cx="480" cy="1140" rx="54" ry="24" fill="#5a4634"/>'
        )
    return (
        f'<path d="M360 900 L350 1120" stroke="{SKIN_DK}" stroke-width="56" fill="none" stroke-linecap="round"/>'
        f'<path d="M440 900 L450 1120" stroke="{SKIN_DK}" stroke-width="56" fill="none" stroke-linecap="round"/>'
        f'<ellipse cx="345" cy="1140" rx="54" ry="24" fill="#5a4634"/>'
        f'<ellipse cx="455" cy="1140" rx="54" ry="24" fill="#5a4634"/>'
    )


def body_layer(pose):
    """Bare pose base: head, neck, arms(skin), legs. No clothes."""
    return svg(CW, CH, f'''
      {legs(pose)}
      <path d="M320 440 L480 440 L500 900 L300 900 Z" fill="{SKIN}"/>
      {arms(pose, SKIN)}
      <rect x="372" y="{HEAD_CY+90}" width="56" height="70" fill="{SKIN}"/>
      <circle cx="{HEAD_CX}" cy="{HEAD_CY}" r="{HEAD_R}" fill="{SKIN}"/>
      <path d="M{HEAD_CX-HEAD_R} {HEAD_CY} a{HEAD_R} {HEAD_R} 0 0 1 {2*HEAD_R} 0 Z" fill="{HAIR}"/>
      <circle cx="{HEAD_CX}" cy="{HEAD_CY-HEAD_R}" r="60" fill="{HAIR}"/>
      <circle cx="{HEAD_CX}" cy="{HEAD_CY-HEAD_R}" r="42" fill="{HAIR_DK}"/>
    ''')


def outfit_layer(pose, kind):
    palette = {
        "vestido": ("#c94f7c", "#a83a63"),   # dress
        "delantal": ("#5aa0c9", "#e8e2d5"),  # apron over blue
        "bata": ("#8a6fb0", "#75589a"),      # house robe
    }
    main, accent = palette[kind]
    extra = ""
    if kind == "delantal":
        extra = f'<path d="M360 470 L440 470 L455 860 L345 860 Z" fill="{accent}"/><rect x="360" y="470" width="80" height="26" fill="{accent}"/>'
    if kind == "bata":
        extra = f'<line x1="400" y1="450" x2="{400 + (30 if pose=="run" else 0)}" y2="900" stroke="{accent}" stroke-width="10"/>'
    return svg(CW, CH, f'''
      <path d="{torso_path(pose)}" fill="{main}"/>
      {arms(pose, main)}
      {extra}
      <path d="M330 445 Q400 480 470 445" stroke="{accent}" stroke-width="14" fill="none"/>
    ''')


def face_layer(pose, expr):
    lx, rx, ey = HEAD_CX - 46, HEAD_CX + 46, HEAD_CY - 20
    brows = {
        "feliz":       f'<path d="M{lx-26} {ey-46} q26 -16 52 0 M{rx-26} {ey-46} q26 -16 52 0" stroke="#7a7a86" stroke-width="9" fill="none" stroke-linecap="round"/>',
        "seria":       f'<path d="M{lx-26} {ey-40} l52 8 M{rx-26} {ey-32} l52 -8" stroke="#7a7a86" stroke-width="9" fill="none" stroke-linecap="round"/>',
        "sorprendida": f'<path d="M{lx-24} {ey-52} q24 -20 48 0 M{rx-24} {ey-52} q24 -20 48 0" stroke="#7a7a86" stroke-width="9" fill="none" stroke-linecap="round"/>',
    }[expr]
    if expr == "feliz":
        eyes = f'<circle cx="{lx}" cy="{ey}" r="12" fill="#3a2c22"/><circle cx="{rx}" cy="{ey}" r="12" fill="#3a2c22"/>'
        mouth = f'<path d="M{HEAD_CX-52} {HEAD_CY+40} q52 60 104 0" stroke="#8a3a3a" stroke-width="12" fill="#b0504a" stroke-linecap="round"/>'
        cheeks = f'<circle cx="{lx-30}" cy="{HEAD_CY+28}" r="20" fill="#e79a8a" opacity="0.55"/><circle cx="{rx+30}" cy="{HEAD_CY+28}" r="20" fill="#e79a8a" opacity="0.55"/>'
    elif expr == "seria":
        eyes = f'<circle cx="{lx}" cy="{ey}" r="11" fill="#3a2c22"/><circle cx="{rx}" cy="{ey}" r="11" fill="#3a2c22"/>'
        mouth = f'<path d="M{HEAD_CX-46} {HEAD_CY+58} q46 -22 92 0" stroke="#8a3a3a" stroke-width="12" fill="none" stroke-linecap="round"/>'
        cheeks = ""
    else:  # sorprendida
        eyes = f'<circle cx="{lx}" cy="{ey}" r="16" fill="#fff" stroke="#3a2c22" stroke-width="4"/><circle cx="{lx}" cy="{ey}" r="8" fill="#3a2c22"/><circle cx="{rx}" cy="{ey}" r="16" fill="#fff" stroke="#3a2c22" stroke-width="4"/><circle cx="{rx}" cy="{ey}" r="8" fill="#3a2c22"/>'
        mouth = f'<ellipse cx="{HEAD_CX}" cy="{HEAD_CY+58}" rx="26" ry="34" fill="#8a3a3a"/>'
        cheeks = ""
    return svg(CW, CH, f'''
      {brows}{eyes}{cheeks}
      <path d="M{HEAD_CX-8} {ey+6} q-14 30 8 40" stroke="{SKIN_DK}" stroke-width="7" fill="none" stroke-linecap="round"/>
      {mouth}
    ''')


def acc_layer(pose, kind):
    lx, rx, ey = HEAD_CX - 46, HEAD_CX + 46, HEAD_CY - 20
    if kind == "lentes":  # glasses
        inner = (f'<circle cx="{lx}" cy="{ey}" r="34" fill="none" stroke="#2f2f38" stroke-width="8"/>'
                 f'<circle cx="{rx}" cy="{ey}" r="34" fill="none" stroke="#2f2f38" stroke-width="8"/>'
                 f'<line x1="{lx+34}" y1="{ey}" x2="{rx-34}" y2="{ey}" stroke="#2f2f38" stroke-width="8"/>')
    elif kind == "aretes":  # earrings
        inner = (f'<circle cx="{HEAD_CX-HEAD_R+6}" cy="{HEAD_CY+40}" r="12" fill="#f4c542"/>'
                 f'<circle cx="{HEAD_CX+HEAD_R-6}" cy="{HEAD_CY+40}" r="12" fill="#f4c542"/>')
    elif kind == "rosario":  # necklace
        inner = f'<path d="M340 470 Q400 560 460 470" fill="none" stroke="#c9a227" stroke-width="10"/><circle cx="400" cy="545" r="12" fill="#c9a227"/><rect x="392" y="552" width="16" height="26" rx="4" fill="#c9a227"/>'
    elif kind == "tubos":  # hair curlers
        inner = "".join(f'<rect x="{HEAD_CX-90+ i*44}" y="{HEAD_CY-HEAD_R-40}" width="34" height="34" rx="8" fill="#e46aa0"/>' for i in range(4))
    else:  # panuelo — headscarf
        inner = (f'<path d="M{HEAD_CX-HEAD_R} {HEAD_CY-20} a{HEAD_R} {HEAD_R} 0 0 1 {2*HEAD_R} 0 Z" fill="#e94f5e"/>'
                 f'<path d="M{HEAD_CX-HEAD_R} {HEAD_CY-20} a{HEAD_R} {HEAD_R} 0 0 1 {2*HEAD_R} 0" fill="none" stroke="#c23a48" stroke-width="6"/>'
                 f'<circle cx="{HEAD_CX-60}" cy="{HEAD_CY-70}" r="6" fill="#fff"/><circle cx="{HEAD_CX+30}" cy="{HEAD_CY-100}" r="6" fill="#fff"/>')
    return svg(CW, CH, inner)


OUTFITS = ["vestido", "delantal", "bata"]
EXPRS = ["feliz", "seria", "sorprendida"]
ACCS = ["lentes", "aretes", "rosario", "tubos", "panuelo"]


def main():
    made = []
    # backgrounds
    made.append(write("assets/bg/beach.svg", bg_beach()))
    made.append(write("assets/bg/home.svg", bg_home()))
    made.append(write("assets/bg/fiesta.svg", bg_fiesta()))
    # props
    for pid, s in PROPS.items():
        made.append(write(f"assets/props/{pid}.svg", s))
    # character layers
    for pose in POSES:
        made.append(write(f"assets/abuela/{pose}/body.svg", body_layer(pose)))
        for o in OUTFITS:
            made.append(write(f"assets/abuela/{pose}/outfit-{o}.svg", outfit_layer(pose, o)))
        for e in EXPRS:
            made.append(write(f"assets/abuela/{pose}/face-{e}.svg", face_layer(pose, e)))
        for a in ACCS:
            made.append(write(f"assets/abuela/{pose}/acc-{a}.svg", acc_layer(pose, a)))
    print(f"Generated {len(made)} assets.")


if __name__ == "__main__":
    main()
