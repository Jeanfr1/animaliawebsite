"""Compose the README assets from qa/readme/ (node scripts/readme-assets.mjs first).
    python3 scripts/readme-composite.py  → .github/assets/{banner.png, hero-intro.gif,
                                            desktop-sections.jpg, mobile-screens.jpg}
"""
import os
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = 'qa/readme'
OUT = '.github/assets'
os.makedirs(OUT, exist_ok=True)
CREAM = (248, 240, 226)
GREEN = (12, 73, 41)
URL = 'animalia-santander.vercel.app'


def font(size):
    for f in ('/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def shadowed(card, radius, pad=40, blur=22, alpha=70):
    w, h = card.size
    out = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', out.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((pad, pad + 10, pad + w, pad + h + 10), radius, fill=(23, 42, 32, alpha))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    mask = Image.new('L', card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
    out.paste(card, (pad, pad), mask)
    return out


def browser(shot, width):
    img = Image.open(shot).convert('RGB')
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    bar = 40
    card = Image.new('RGB', (width, img.height + bar), (255, 255, 255))
    d = ImageDraw.Draw(card)
    d.rectangle((0, 0, width, bar), fill=(236, 231, 222))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse((16 + i * 20, 14, 28 + i * 20, 26), fill=c)
    d.rounded_rectangle((width * 0.3, 9, width * 0.7, 31), 11, fill=(255, 255, 255))
    f = font(13)
    tw = d.textlength(URL, font=f)
    d.text(((width - tw) / 2, 13), URL, font=f, fill=(90, 90, 90))
    card.paste(img, (0, bar))
    return shadowed(card, 12)


def phone(shot, width):
    img = Image.open(shot).convert('RGB')
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    b, bar = 12, 34
    screen = Image.new('RGB', (width, img.height + bar), CREAM)
    screen.paste(img, (0, bar))
    w, h = width + b * 2, screen.height + b * 2
    frame = Image.new('RGB', (w, h), (24, 26, 25))
    mask = Image.new('L', screen.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, screen.width - 1, screen.height - 1), 34, fill=255)
    frame.paste(screen, (b, b), mask)
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((w / 2 - 42, b + 7, w / 2 + 42, b + 27), 10, fill=(24, 26, 25))
    d.text((b + 26, b + 9), '9:41', font=font(13), fill=(23, 42, 32))
    return shadowed(frame, 46)


# banner
shutil.copy(f'{SRC}/banner.png', f'{OUT}/banner.png')

# hero intro GIF
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '12', '-i', f'{SRC}/gif/f_%04d.png', '-vf',
                'fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
                '-loop', '0', f'{OUT}/hero-intro.gif'], check=True)

# desktop sections, 2 x 2
cards = [browser(f'{SRC}/{n}.png', 820) for n in ('d-shop', 'd-groom', 'd-visit', 'd-footer')]
cw = max(c.width for c in cards)
rows = [max(cards[0].height, cards[1].height), max(cards[2].height, cards[3].height)]
sheet = Image.new('RGBA', (cw * 2 + 40, sum(rows) + 60), CREAM + (255,))
for i, c in enumerate(cards):
    x = 20 + (i % 2) * cw
    y = 30 + (0 if i < 2 else rows[0])
    sheet.alpha_composite(c, (x, y))
sheet.convert('RGB').save(f'{OUT}/desktop-sections.jpg', quality=84, optimize=True, progressive=True)

# phones
ph = [phone(f'{SRC}/{n}.png', 300) for n in ('m-hero', 'm-shop', 'm-groom', 'm-visit')]
sheet = Image.new('RGBA', (sum(p.width for p in ph) + 40, ph[0].height + 40), CREAM + (255,))
x = 20
for p in ph:
    sheet.alpha_composite(p, (x, 20))
    x += p.width
sheet.convert('RGB').save(f'{OUT}/mobile-screens.jpg', quality=84, optimize=True, progressive=True)

for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    print(f, Image.open(p).size, f'{os.path.getsize(p) / 1e6:.2f} MB')
