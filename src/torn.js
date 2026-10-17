// Torn-paper outline as a CSS polygon, deterministic per seed.
// w, h: box size in board px (only the ratio matters); amp: tear depth in
// board px; sides: which edges are torn ("trbl"); untorn edges stay straight.
// Points are in %, so the outline scales with the box.

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function tornPolygon(w, h, seed = 1, amp = 4, sides = 'trbl') {
  const rand = rng(seed * 9973 + 17)
  const step = 4.5
  const pts = []
  // depth: small jitter, slow wander and the odd deeper bite
  let wander = 0
  const depth = () => {
    wander = Math.max(0, Math.min(1, wander + (rand() - 0.5) * 0.5))
    const bite = rand() < 0.06 ? rand() * 0.9 : 0
    return amp * Math.min(1, 0.15 + wander * 0.55 + rand() * 0.3 + bite)
  }
  const edge = (torn, from, to, inward) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    const n = torn ? Math.max(2, Math.round(len / step)) : 1
    for (let i = 0; i < n; i++) {
      const t = i / n
      let x = from[0] + (to[0] - from[0]) * t
      let y = from[1] + (to[1] - from[1]) * t
      if (torn && i > 0) {
        const d = depth()
        x += inward[0] * d + (rand() - 0.5) * step * 0.6 * Math.abs(inward[1])
        y += inward[1] * d + (rand() - 0.5) * step * 0.6 * Math.abs(inward[0])
      }
      pts.push([x, y])
    }
  }
  edge(sides.includes('t'), [0, 0], [w, 0], [0, 1])
  edge(sides.includes('r'), [w, 0], [w, h], [-1, 0])
  edge(sides.includes('b'), [w, h], [0, h], [0, -1])
  edge(sides.includes('l'), [0, h], [0, 0], [1, 0])
  const pct = (v, total) => `${Math.max(0, Math.min(100, (v / total) * 100)).toFixed(2)}%`
  return `polygon(${pts.map(([x, y]) => `${pct(x, w)} ${pct(y, h)}`).join(',')})`
}
