"""Ink geometry of the hero title lines, board vs page (both at 1024 px).
    python3 scripts/measure-title.py qa/compare-page.png
Per line: bbox, centroid and principal angle of the letter ink, found by
colour (green / orange) and split into lines by component centroid."""
import sys

import cv2
import numpy as np

BOARD = '02-direcao/modelo-escolhido.png'


def lines(path):
    img = cv2.imread(path)[:, :1024]
    img = cv2.resize(img, (1024, 1536)) if img.shape[0] != 1536 and img.shape[0] > 1536 else img
    roi = img[130:430, 20:490].astype(int)
    b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
    green = (r < 70) & (g > 40) & (g < 110) & (b < 80) & (g > r + 15)
    orange = (r > 200) & (g > 100) & (g < 175) & (b < 90) & (r - b > 150)
    out = {}
    for name, mask in (('green', green), ('orange', orange)):
        n, lab, stats, cents = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
        for i in range(1, n):
            x, y, w, h, area = stats[i]
            if area < 120:
                continue
            cx, cy = cents[i]
            gy = cy + 130
            if name == 'orange':
                key = 'patitas'
                # logo, sparks and the dog's ear are orange too
                if gy < 290 or x + 20 >= 469:
                    continue
            else:
                # split Para / gustos by a slanted divider
                key = 'Para' if gy < 252 - (cx + 20) * 0.03 else 'gustos'
            out.setdefault(key, []).append(lab == i)
    res = {}
    for key, masks in out.items():
        m = np.any(masks, axis=0)
        ys, xs = np.nonzero(m)
        xs = xs + 20
        ys = ys + 130
        cx, cy = xs.mean(), ys.mean()
        mu20 = ((xs - cx) ** 2).mean()
        mu02 = ((ys - cy) ** 2).mean()
        mu11 = ((xs - cx) * (ys - cy)).mean()
        ang = 0.5 * np.degrees(np.arctan2(2 * mu11, mu20 - mu02))
        res[key] = dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()),
                        w=int(xs.max() - xs.min()), cx=round(cx, 1), cy=round(cy, 1), ang=round(ang, 2), area=int(m.sum()))
    return res


b = lines(BOARD)
p = lines(sys.argv[1]) if len(sys.argv) > 1 else {}
if '--json' in sys.argv:
    import json
    conv = lambda d: {k: {kk: float(vv) for kk, vv in v.items()} for k, v in d.items()}  # noqa: E731
    print(json.dumps({'board': conv(b), 'page': conv(p)}))
    sys.exit()
for k in ('Para', 'gustos', 'patitas'):
    bb, pp = b.get(k), p.get(k)
    print(k, '\n  board', bb, '\n  page ', pp)
    if bb and pp:
        print(f'  -> scale x{bb["w"] / pp["w"]:.3f}  d-angle {bb["ang"] - pp["ang"]:+.2f}  move ({bb["cx"] - pp["cx"]:+.1f}, {bb["cy"] - pp["cy"]:+.1f})  area ratio {bb["area"] / pp["area"]:.2f}')
