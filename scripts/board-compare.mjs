// Page vs approved board (02-direcao/modelo-escolhido.png) at 1 css px = 1 board px.
//   npm run build && npm run preview   (port 4197)
//   node scripts/board-compare.mjs [base]
// → qa/compare-page.png (page, final frame), qa/compare-side.png (board | page),
//   qa/compare-blend.png (50 % blend), qa/compare.json (mean abs diff per band)
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const base = process.argv[2] || 'http://localhost:4197/'
const BOARD = '02-direcao/modelo-escolhido.png'
const W = 1024
const H = 1536
await mkdir('qa', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: W, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  await document.fonts.ready
  // walk the page so lazy images load, then come back
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 140))
  }
  scrollTo(0, 0)
  for (const img of document.images) img.loading = 'eager'
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => i.addEventListener('load', r, { once: true })))))
})
await page.waitForTimeout(300)
const shot = await page.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: W, height: H } })
await browser.close()

await sharp(shot).toFile('qa/compare-page.png')
const board = await sharp(BOARD).removeAlpha().resize(W, H).raw().toBuffer()
const pageRaw = await sharp(shot).removeAlpha().resize(W, H).raw().toBuffer()

const bands = { header: [0, 55], hero: [55, 598], shop: [598, 930], groom: [930, 1240], visit: [1240, 1536] }
const out = {}
for (const [name, [y0, y1]] of Object.entries(bands)) {
  let sum = 0
  let n = 0
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3
      sum += Math.abs(board[i] - pageRaw[i]) + Math.abs(board[i + 1] - pageRaw[i + 1]) + Math.abs(board[i + 2] - pageRaw[i + 2])
      n += 3
    }
  out[name] = +(sum / n).toFixed(1)
}
const blend = Buffer.alloc(board.length)
for (let i = 0; i < board.length; i++) blend[i] = (board[i] + pageRaw[i]) >> 1
await sharp(blend, { raw: { width: W, height: H, channels: 3 } }).png().toFile('qa/compare-blend.png')
await sharp({ create: { width: W * 2 + 16, height: H, channels: 3, background: '#ffffff' } })
  .composite([
    { input: await sharp(BOARD).removeAlpha().resize(W, H).png().toBuffer(), left: 0, top: 0 },
    { input: shot, left: W + 16, top: 0 },
  ])
  .png()
  .toFile('qa/compare-side.png')
console.log('mean abs diff /255 per band', out)
await import('node:fs').then((fs) => fs.writeFileSync('qa/compare.json', JSON.stringify(out, null, 2)))
