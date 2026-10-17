// Full-page and viewport captures of the production build.
//   node scripts/shots.mjs [base]  → qa/shot-<w>.png (full page, final frame)
//                                    qa/intro-<w>-<ms>.png (hero at intro times)
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:4197/'
await mkdir('qa', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

const walk = (page) =>
  page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 350) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 140))
    }
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))))
    scrollTo(0, 0)
  })

for (const [w, h, dpr] of [[1440, 900, 1], [390, 844, 2]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await walk(page)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `qa/shot-${w}.png`, fullPage: true })
  for (const t of [0, 600, 1200, 1800, 2400, 2800, 3200, 4400]) {
    await page.goto(new URL(`?t=${t}`, base).href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.introState === 'paused')
    await page.waitForTimeout(120)
    await page.screenshot({ path: `qa/intro-${w}-${String(t).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: w, height: w > 900 ? Math.round((598 * Math.min(w, 1600)) / 1024) : 640 } })
  }
  await page.close()
}
await browser.close()
console.log('shots done')
