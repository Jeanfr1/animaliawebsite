"""Ink boxes of the text blocks and buttons, board vs page (both at 1024 px).
    python3 scripts/measure-blocks.py qa/compare-page.png
Each block: a board-px search region and an ink class; prints the ink bbox in
both images and the deltas (dx0, dy0, dx1, dy1, width ratio)."""
import sys

import cv2
import numpy as np

BOARD = '02-direcao/modelo-escolhido.png'

INK = {
    'dark': lambda b, g, r: (r + g + b) < 260,
    'text': lambda b, g, r: (r + g + b) < 420,
    'green': lambda b, g, r: (r < 70) & (g > 40) & (g < 110) & (b < 80) & (g > r + 15),
    'orange': lambda b, g, r: (r > 200) & (g > 100) & (g < 175) & (b < 90) & (r - b > 150),
    'btn': lambda b, g, r: (r < 40) & (g > 55) & (g < 95) & (b > 30) & (b < 70),
    'obtn': lambda b, g, r: (r > 200) & (g > 105) & (g < 150) & (b < 60),
}

BLOCKS = [
    ('nav', (195, 12, 745, 46), 'text'),
    ('nav-home', (195, 12, 260, 46), 'orange'),
    ('hdr-btn', (800, 2, 1010, 54), 'btn'),
    ('hero-sub', (110, 396, 410, 458), 'dark'),
    ('hero-btn-o', (25, 458, 240, 520), 'obtn'),
    ('perk-labels', (15, 553, 470, 597), 'dark'),
    ('perk-icons', (15, 518, 470, 557), 'dark'),
    ('shop-h2', (40, 655, 335, 772), 'green'),
    ('shop-body', (60, 768, 355, 845), 'text'),
    ('shop-btn', (60, 850, 280, 905), 'btn'),
    ('groom-h-green', (655, 925, 905, 1003), 'green'),
    ('groom-h-orange', (665, 995, 930, 1095), 'orange'),
    ('groom-body', (680, 1096, 912, 1168), 'text'),
    ('groom-btn', (680, 1172, 925, 1230), 'btn'),
    ('visit-h-green', (45, 1232, 200, 1282), 'green'),
    ('visit-h-orange', (50, 1278, 232, 1324), 'orange'),
    ('visit-h-nos', (205, 1275, 300, 1324), 'green'),
    ('visit-body', (55, 1322, 275, 1410), 'text'),
    ('visit-addr', (88, 1416, 295, 1455), 'dark'),
    ('visit-btn', (52, 1456, 235, 1504), 'btn'),
]


def boxes(path):
    img = cv2.imread(path)[:1536, :1024].astype(int)
    out = {}
    for name, (x0, y0, x1, y1), ink in BLOCKS:
        roi = img[y0:y1, x0:x1]
        m = INK[ink](roi[..., 0], roi[..., 1], roi[..., 2])
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
        ys, xs = np.nonzero(m)
        out[name] = None if len(xs) < 20 else (x0 + xs.min(), y0 + ys.min(), x0 + xs.max(), y0 + ys.max())
    return out


b = boxes(BOARD)
p = boxes(sys.argv[1])
for name, *_ in BLOCKS:
    bb, pp = b[name], p[name]
    if not bb or not pp:
        print(f'{name:15} board {bb} page {pp}')
        continue
    d = [pp[i] - bb[i] for i in range(4)]
    wr = (pp[2] - pp[0]) / max(1, bb[2] - bb[0])
    hr = (pp[3] - pp[1]) / max(1, bb[3] - bb[1])
    flag = '' if max(map(abs, d)) <= 3 and abs(1 - wr) < 0.03 else '  <--'
    print(f'{name:15} board {bb}  page {pp}  d {d}  w x{wr:.3f} h x{hr:.3f}{flag}')
