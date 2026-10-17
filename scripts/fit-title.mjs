// Fit the hero title lines to the board's ink (size, angle, position).
//   node scripts/fit-title.mjs [base]   (preview on :4197)
// Each round renders at 1024 px, measures the green/orange ink per line with
// scripts/measure-title.py and nudges --ls / rotate / --lx / --ly. Prints the
// CSS to paste into src/styles.css.
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:4197/'
const cur = {
  1: { lx: 31, ly: 258, ls: 108, rot: -9 },
  2: { lx: 41, ly: 309, ls: 104, rot: -4.5 },
  3: { lx: 32, ly: 394, ls: 126, rot: -2 },
}
const names = { 1: 'Para', 2: 'gustos', 3: 'patitas' }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1024, height: 800 }, reducedMotion: 'reduce' })
await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

const css = () =>
  Object.entries(cur)
    .map(([i, v]) => `.hero__line--${i}{--lx:${v.lx.toFixed(1)};--ly:${v.ly.toFixed(1)};--ls:${v.ls.toFixed(1)};rotate:${v.rot.toFixed(2)}deg}`)
    .join('\n')

let tag = null
for (let round = 0; round < 6; round++) {
  if (tag) await tag.evaluate((n) => n.remove())
  tag = await page.addStyleTag({ content: css() })
  await page.waitForTimeout(150)
  await page.screenshot({ path: 'qa/fit-title.png', clip: { x: 0, y: 0, width: 1024, height: 1536 }, fullPage: true })
  const res = JSON.parse(execFileSync('python3', ['scripts/measure-title.py', 'qa/fit-title.png', '--json']).toString())
  let worst = 0
  for (const i of [1, 2, 3]) {
    const b = res.board[names[i]]
    const p = res.page[names[i]]
    const v = cur[i]
    const s = b.w / p.w
    // scale about the line origin, then rotate, then move the centroid
    v.ls *= s
    v.rot += (b.ang - p.ang) * 0.8
    const pcx = v.lx + (p.cx - v.lx) * s
    const pcy = v.ly + (p.cy - v.ly) * s
    v.lx += (b.cx - pcx) * 0.9
    v.ly += (b.cy - pcy) * 0.9
    worst = Math.max(worst, Math.abs(1 - s) * 100, Math.abs(b.cx - p.cx), Math.abs(b.cy - p.cy), Math.abs(b.ang - p.ang))
  }
  console.log(`round ${round}: worst ${worst.toFixed(2)}`)
  if (worst < 0.6) break
}
console.log(css())
await browser.close()
