#!/usr/bin/env python3
"""Printable join-the-directory signs. One QR per studio."""

from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "qr"
FONTS = Path("/tmp/ohlala-fonts")
LOGO = ROOT / "images" / "logo.png"

WINE = (93, 26, 58)
CREAM = (253, 250, 248)
ROSE = (232, 180, 168)
INK = (42, 23, 32)
WHITE = (255, 255, 255)

JOIN = "https://ohlalasalonstudio.com/pros/join?location={slug}"

STUDIOS = [
    {"slug": "summerville", "name": "Summerville"},
]


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def text_width(draw, text, face):
    box = draw.textbbox((0, 0), text, font=face)
    return box[2] - box[0]


def center(draw, text, y, face, fill):
    width = text_width(draw, text, face)
    draw.text(((1700 - width) / 2, y), text, font=face, fill=fill)


def qr_image(url):
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=16, border=2)
    code.add_data(url)
    code.make(fit=True)
    img = code.make_image(fill_color=WINE, back_color=WHITE).convert("RGB")
    return img


def sign(studio, qr):
    page = Image.new("RGB", (1700, 2200), CREAM)
    draw = ImageDraw.Draw(page)
    draw.rectangle((0, 0, 1699, 2199), outline=WINE, width=36)
    draw.rectangle((58, 58, 1641, 2141), outline=ROSE, width=8)

    logo = Image.open(LOGO).convert("RGBA")
    target = 860
    logo = logo.resize((target, round(target * logo.height / logo.width)), Image.Resampling.LANCZOS)
    plate = Image.new("RGBA", logo.size, CREAM + (255,))
    plate.alpha_composite(logo)
    page.paste(plate.convert("RGB"), ((1700 - plate.width) // 2, 120))

    display = font("PlayfairDisplay-Bold.ttf", 92)
    body = font("Montserrat-Medium.ttf", 42)
    scan = font("Montserrat-SemiBold.ttf", 40)
    small = font("Montserrat-Medium.ttf", 32)

    center(draw, "Rent here?", 430, display, WINE)
    center(draw, "Get listed on our website.", 560, body, INK)
    center(draw, "Scan to add your profile.", 640, scan, WINE)

    qr_size = 760
    qr_fit = qr.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    left = (1700 - qr_size) // 2
    top = 760
    pad = 28
    draw.rounded_rectangle(
        (left - pad, top - pad, left + qr_size + pad, top + qr_size + pad),
        radius=28,
        fill=WHITE,
        outline=ROSE,
        width=8,
    )
    page.paste(qr_fit, (left, top))

    center(draw, "Oh La La Salon & Studios", 1680, body, WINE)
    center(draw, studio["name"], 1760, small, INK)
    return page


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for studio in STUDIOS:
        url = JOIN.format(slug=studio["slug"])
        code = qr_image(url)
        code_path = OUT / f"{studio['slug']}.png"
        quiet = Image.new("RGB", (code.width + 64, code.height + 64), WHITE)
        quiet.paste(code, (32, 32))
        quiet.save(code_path, "PNG")
        page = sign(studio, code)
        png_path = OUT / f"{studio['slug']}-sign.png"
        pdf_path = OUT / f"{studio['slug']}-sign.pdf"
        page.save(png_path, "PNG")
        page.save(pdf_path, "PDF", resolution=200.0)
        print(url)
        print(code_path)
        print(png_path)
        print(pdf_path)


if __name__ == "__main__":
    main()
