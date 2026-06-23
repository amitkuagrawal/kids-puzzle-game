"""Generate shapes.json for the free Shapes pack (ages 3-5).

Shapes are rendered programmatically with Pillow — no licensing questions, fully
re-runnable. Each shape is a big bright figure on a soft background, sized to work
as a puzzle image and as the Learn-screen hero.

Usage: cd backend && python content/generate_shapes.py
Then load with: python load_content.py
"""
import base64
import io
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).parent / "shapes.json"
SIZE = 640
PAD = 90  # margin around the shape

PACK = {
    "name": "Shapes", "icon": "🔷", "color": "#9C27B0",
    "ageBand": "3-5", "isFree": True, "freeSampleCount": 0,
    "productId": None, "order": 1,
}


def _canvas(bg):
    img = Image.new("RGB", (SIZE, SIZE), bg)
    return img, ImageDraw.Draw(img)


def _b64(img) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _regular_polygon(n, rotation_deg=-90):
    cx = cy = SIZE / 2
    r = (SIZE - 2 * PAD) / 2
    rot = math.radians(rotation_deg)
    return [
        (cx + r * math.cos(rot + 2 * math.pi * i / n),
         cy + r * math.sin(rot + 2 * math.pi * i / n))
        for i in range(n)
    ]


def _star(points=5):
    cx = cy = SIZE / 2
    outer = (SIZE - 2 * PAD) / 2
    inner = outer * 0.42
    pts = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = math.radians(-90 + i * 180 / points)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _heart():
    cx, cy = SIZE / 2, SIZE / 2 + 30
    s = (SIZE - 2 * PAD) / 32
    pts = []
    for t in [i / 100 * 2 * math.pi for i in range(101)]:
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * s, cy - y * s))
    return pts


def draw_shape(kind, fill):
    bg = "#FFF7E6"
    img, d = _canvas(bg)
    if kind == "circle":
        d.ellipse([PAD, PAD, SIZE - PAD, SIZE - PAD], fill=fill)
    elif kind == "oval":
        d.ellipse([PAD - 20, PAD + 60, SIZE - PAD + 20, SIZE - PAD - 60], fill=fill)
    elif kind == "square":
        d.rectangle([PAD, PAD, SIZE - PAD, SIZE - PAD], fill=fill)
    elif kind == "rectangle":
        d.rectangle([PAD - 30, PAD + 70, SIZE - PAD + 30, SIZE - PAD - 70], fill=fill)
    elif kind == "triangle":
        d.polygon(_regular_polygon(3), fill=fill)
    elif kind == "diamond":
        d.polygon(_regular_polygon(4, rotation_deg=-90), fill=fill)
    elif kind == "pentagon":
        d.polygon(_regular_polygon(5), fill=fill)
    elif kind == "hexagon":
        d.polygon(_regular_polygon(6, rotation_deg=-90), fill=fill)
    elif kind == "star":
        d.polygon(_star(5), fill=fill)
    elif kind == "heart":
        d.polygon(_heart(), fill=fill)
    else:
        raise ValueError(kind)
    return _b64(img)


# name, kind, color, sides label, looks-like, cool fact, short text, detail text, emoji
SHAPES = [
    ("Circle", "circle", "#FF5252", "0 (round!)", "a ball or the sun ☀️",
     "A circle is perfectly round with no corners at all!",
     "A circle is a round shape with no sides and no corners. It looks the same all the way around!",
     "A circle is perfectly round, like a ball, a wheel, or the sun. It has no corners and no straight sides — you can trace all the way around without ever stopping at a corner.", "⭕"),
    ("Square", "square", "#448AFF", "4 equal sides", "a window or a cracker 🪟",
     "A square has 4 sides that are all the same size!",
     "A square has 4 straight sides that are all exactly the same length, and 4 corners.",
     "A square has 4 straight sides that are all the same length and 4 square corners. You can see squares in windows, crackers, picture frames, and checkerboards.", "🟦"),
    ("Triangle", "triangle", "#4CAF50", "3 sides", "a slice of pizza 🍕",
     "A triangle has 3 sides and 3 pointy corners!",
     "A triangle is a shape with 3 straight sides and 3 corners.",
     "A triangle has 3 straight sides and 3 pointy corners. You can spot triangles in a slice of pizza, a roof on a house, or a party hat!", "🔺"),
    ("Rectangle", "rectangle", "#FF9800", "4 sides", "a door or a book 🚪",
     "A rectangle has 2 long sides and 2 short sides!",
     "A rectangle has 4 sides and 4 corners, with 2 long sides and 2 short sides.",
     "A rectangle has 4 corners and 4 sides — two long ones and two short ones. Doors, books, phones, and beds are all shaped like rectangles.", "▬"),
    ("Star", "star", "#FFC107", "5 points", "stars in the night sky 🌟",
     "A star has 5 pointy points!",
     "A star shape has 5 points sticking out, just like the stars we see twinkling at night.",
     "A star shape has 5 pointy points. We draw stars to look like the twinkling lights in the night sky, and you'll find them on flags and gold stickers too!", "⭐"),
    ("Heart", "heart", "#E91E63", "2 curves + 1 point", "love and Valentine's Day 💝",
     "A heart shape means love!",
     "A heart has two round bumps at the top and a point at the bottom. It's the shape we use to say 'I love you!'",
     "A heart has two rounded bumps at the top that curve down to a single point at the bottom. People draw hearts to show love, especially on Valentine's Day.", "❤️"),
    ("Diamond", "diamond", "#00BCD4", "4 sides", "a kite flying high 🪁",
     "A diamond is like a square balancing on its corner!",
     "A diamond has 4 sides and looks like a square tipped to balance on one of its corners.",
     "A diamond shape has 4 equal sides and sits balancing on a point, like a kite flying in the wind. It's also called a rhombus.", "🔷"),
    ("Pentagon", "pentagon", "#7E57C2", "5 sides", "a house drawing 🏠",
     "A pentagon has 5 sides!",
     "A pentagon is a shape with 5 straight sides and 5 corners.",
     "A pentagon has 5 straight sides and 5 corners. If you draw a simple house with a pointy roof, the outline is a pentagon!", "⬟"),
    ("Hexagon", "hexagon", "#26A69A", "6 sides", "a honeycomb 🐝",
     "A hexagon has 6 sides!",
     "A hexagon is a shape with 6 straight sides and 6 corners.",
     "A hexagon has 6 straight sides and 6 corners. Bees build their honeycomb out of lots of little hexagons fitted neatly together!", "⬡"),
    ("Oval", "oval", "#EF5350", "0 (curvy!)", "an egg 🥚",
     "An oval is like a stretched-out circle!",
     "An oval is a curvy shape like a circle that has been gently stretched longer.",
     "An oval looks like a circle that has been stretched out long, with no corners. Eggs, rugby balls, and many mirrors are oval shaped.", "🥚"),
]


def main():
    items = []
    for name, kind, color, sides, looks, cool, short, detail, emoji in SHAPES:
        print(f"  drawing {name}...", end=" ", flush=True)
        img = draw_shape(kind, color)
        items.append({
            "name": name,
            "image_base64": img,
            "learn": {
                "structured": [
                    {"label": "Sides", "value": sides},
                    {"label": "Looks like", "value": looks},
                    {"label": "Cool fact", "value": cool},
                ],
                "shortText": short,
                "detailText": detail,
                "emoji": emoji,
            },
        })
        print("ok")
    OUT.write_text(json.dumps({"pack": PACK, "items": items}, ensure_ascii=False, indent=2))
    print(f"\nWrote {len(items)} shapes to {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
