"""Image masters for the site, built from the kit into assets-src/ (gitignored).

    npm run prepare-images                # everything
    npm run prepare-images -- groom shop  # only some targets

Kit photos and layers are low resolution for a full-bleed desktop page, so
they go through Real-ESRGAN x4plus (scripts/esrgan.py, MPS when available).
Alpha layers are upscaled colour and alpha separately (colour first gets its
transparent area filled from the edges, so the model never blends fur into
black). The services post is cleaned of its baked text list and Instagram UI
before the crop that frames the groomer and the dog.
"""
import os
import sys

import cv2
import numpy as np

from esrgan import load_model, sr4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = lambda p: os.path.join(ROOT, p)  # noqa: E731
OUT = os.path.join(ROOT, 'assets-src')
os.makedirs(OUT, exist_ok=True)

_net = None


def net():
    global _net
    if _net is None:
        _net = load_model()
    return _net


def read(path):
    img = cv2.imread(KIT(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f'missing {path}')
    return img


def fill_transparent(bgr, alpha):
    """Push-pull fill: colour of transparent pixels from the nearest opaque ones."""
    w = (alpha > 8).astype(np.float32)
    c = bgr.astype(np.float32) * w[..., None]
    levels = []
    while min(c.shape[:2]) > 8:
        levels.append((c, w))
        c, w = cv2.pyrDown(c), cv2.pyrDown(w)
    est = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(levels):
        est = cv2.resize(est, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LINEAR)
        known = c / np.maximum(w, 1e-6)[..., None]
        m = np.clip(w * 4, 0, 1)[..., None]
        est = known * m + est * (1 - m)
    return np.clip(est, 0, 255).astype(np.uint8)


def sr(bgr, factor):
    """Real-ESRGAN x4, then INTER_AREA down to the requested factor."""
    h, w = bgr.shape[:2]
    big = sr4(net(), bgr)
    if factor == 4:
        return big
    return cv2.resize(big, (round(w * factor), round(h * factor)), interpolation=cv2.INTER_AREA)


def sr_rgba(bgra, factor):
    bgr, a = bgra[..., :3], bgra[..., 3]
    colour = sr(fill_transparent(bgr, a), factor)
    alpha = sr(cv2.merge([a, a, a]), factor).mean(axis=2)
    alpha = np.clip(alpha, 0, 255).astype(np.uint8)
    return np.dstack([colour, alpha])


def save(name, img):
    path = os.path.join(OUT, name)
    cv2.imwrite(path, img)
    print(f'  {name} {img.shape[1]}x{img.shape[0]}')


def t_logo():
    save('logo.png', sr_rgba(read('01-identidade/animalia-logo-transparente.png'), 4))


def t_cenario():
    save('cenario.png', sr(read('03-hero/cenario.png')[..., :3], 2))


def t_dogs():
    save('dog-open.png', sr_rgba(read('05-camadas/beagle-olhos-abertos.png'), 2))
    save('dog-wink.png', sr_rgba(read('05-camadas/beagle-piscadela.png'), 2))


def t_snack():
    # The bone is small on screen: crop to its alpha box (+ margin), no upscale.
    # src/data/board.json keeps the crop offset so the placement stays exact.
    img = read('05-camadas/petisco.png')
    a = img[..., 3]
    ys, xs = np.where(a > 8)
    pad = 24
    x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
    x1, y1 = min(xs.max() + pad + 1, img.shape[1]), min(ys.max() + pad + 1, img.shape[0])
    crop = img[y0:y1, x0:x1].copy()
    crop[..., :3] = fill_transparent(crop[..., :3], crop[..., 3])
    print(f'  snack crop offset {x0},{y0}')
    save('snack.png', crop)


def t_shop():
    save('shop.png', sr(read('04-fotos-originais/loja-alimentacao.png')[..., :3], 2))


def t_facade():
    save('facade.png', sr(read('04-fotos-originais/fachada.png')[..., :3], 4))


# Services post (1414x1802): white list rows, paw tiles, the bubble sitting on
# the last row and the carousel arrow are painted over with the post's own
# orange wall texture. The cut-out dog's ears reach into the last row and are
# kept (anything that is neither the orange wall, the white rows nor the green
# lettering).
GROOM_CROP = (180, 470, 1414, 1180)        # x0, y0, x1, y1 in the original
GROOM_ROWS = (96, 418, 1012, 852)          # all list rows incl. paw tiles and shadows
GROOM_BUBBLE = (874, 780, 1054, 960)       # bubble overlapping the last row
GROOM_TEXTURE = (24, 880, 424, 1240)       # clean orange wall, left of the dog
GROOM_ARROW = (1372, 868, 1414, 942)       # Instagram "next" chevron


def smooth_field(img, valid, sigma):
    """Low-frequency colour of the valid pixels, pushed under the invalid ones."""
    filled = fill_transparent(img, valid.astype(np.uint8) * 255)
    return cv2.GaussianBlur(filled.astype(np.float32), (0, 0), sigma)


def texture_fill(img, mask, src, valid):
    """Mirrored tiles of the src texture under mask, relit to the surrounding wall."""
    sx0, sy0, sx1, sy1 = src
    tile = img[sy0:sy1, sx0:sx1]
    tile = np.concatenate([tile, tile[:, ::-1]], axis=1)
    tile = np.concatenate([tile, tile[::-1]], axis=0)
    h, w = img.shape[:2]
    field = np.tile(tile, (h // tile.shape[0] + 1, w // tile.shape[1] + 1, 1))[:h, :w].astype(np.float32)
    sigma = 28
    tex_low = cv2.GaussianBlur(field, (0, 0), sigma)
    wall_low = smooth_field(img, valid & ~mask, sigma)
    relit = np.clip(field - tex_low + wall_low, 0, 255)
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.5)[..., None]
    return (relit * soft + img.astype(np.float32) * (1 - soft)).astype(np.uint8)


def t_groom():
    img = read('04-fotos-originais/servicos-equipe.png')[..., :3].copy()
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    wall = (hue >= 6) & (hue <= 22) & (sat > 90) & (val > 150)
    white = (sat < 45) & (val > 200)
    green = (hue >= 30) & (hue <= 90) & (sat > 60)
    mask = np.zeros(img.shape[:2], bool)
    x0, y0, x1, y1 = GROOM_ROWS
    mask[y0:y1, x0:x1] = True
    bx0, by0, bx1, by1 = GROOM_BUBBLE
    yy, xx = np.ogrid[: img.shape[0], : img.shape[1]]
    mask |= ((xx - (bx0 + bx1) / 2) ** 2 + (yy - (by0 + by1) / 2) ** 2) <= ((bx1 - bx0) / 2) ** 2
    dog = ~(wall | white | green)
    dog[: 826] = False
    dog[:, :420] = False
    dog[:, 860:] = False
    dog = cv2.morphologyEx(dog.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    dog = cv2.dilate(dog, np.ones((3, 3), np.uint8)) > 0
    mask &= ~dog
    # the dog's tan fur passes the wall test: keep it out of the lighting field
    wall[820:, 400:880] = False
    img = texture_fill(img, mask, GROOM_TEXTURE, wall)
    ax0, ay0, ax1, ay1 = GROOM_ARROW
    arrow = np.zeros(img.shape[:2], np.uint8)
    arrow[ay0:ay1, ax0:ax1] = 255
    img = cv2.inpaint(img, arrow, 9, cv2.INPAINT_TELEA)
    cx0, cy0, cx1, cy1 = GROOM_CROP
    crop = img[cy0:cy1, cx0:cx1]
    cv2.imwrite(os.path.join(OUT, 'groom-clean-1x.png'), crop)
    if '--no-sr' in sys.argv:
        return
    save('groom.png', sr(crop, 2))


TARGETS = {'logo': t_logo, 'cenario': t_cenario, 'dogs': t_dogs, 'snack': t_snack,
           'shop': t_shop, 'facade': t_facade, 'groom': t_groom}

if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(TARGETS)
    for n in names:
        print(n)
        TARGETS[n]()
