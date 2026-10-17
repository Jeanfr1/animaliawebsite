// README captures from the production build (npm run build && npm run preview).
//   node scripts/readme-assets.mjs [base]  → qa/readme/*.png
//   then: python3 scripts/readme-composite.py → .github/assets/*
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:4197/'
const OUT = 'qa/readme'
await rm(OUT, { recursive: true, force: true })
await mkdir(`${OUT}/gif`, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })

const settle = (page) =>
  page.evaluate(async () => {
    await document.fonts.ready
    for (let y = 0; y < document.body.scrollHeight; y += 350) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 140))
    }
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))))
    scrollTo(0, 0)
  })

// 1. hero intro frames (time-driven, 12 fps), seeking the page's own animations
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(new URL('?t=0', base).href, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.introState === 'paused')
  await page.evaluate(() => document.fonts.ready)
  const clip = { x: 0, y: 0, width: 1440, height: Math.round((598 * 1440) / 1024) }
  let n = 0
  const shoot = async (ms) => {
    await page.evaluate((ms) => document.getAnimations().forEach((a) => (a.currentTime = ms)), ms)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.screenshot({ path: path.join(OUT, 'gif', `f_${String(n++).padStart(4, '0')}.png`), clip })
  }
  for (let i = 0; i < 6; i++) await shoot(0)
  for (let ms = 0; ms <= 4400; ms += 1000 / 12) await shoot(ms)
  for (let i = 0; i < 18; i++) await shoot(4400)
  await page.close()
}

// 2. desktop sections at 1440 (final frame)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  await settle(page)
  await page.waitForTimeout(900)
  for (const [name, sel] of [['d-hero', '#inicio'], ['d-shop', '#tienda'], ['d-groom', '#peluqueria'], ['d-visit', '#nosotros'], ['d-footer', '#contacto']]) {
    const box = await page.evaluate((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect()
      return { y: r.top + scrollY, h: r.height }
    }, sel)
    const y = name === 'd-hero' ? 0 : Math.max(0, box.y - 30)
    const h = name === 'd-hero' ? Math.round((598 * 1440) / 1024) : Math.min(900, box.h + 60)
    await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y, width: 1440, height: h }, fullPage: true })
  }
  await page.close()
}

// 3. phone screens at 390 x 844 (dpr 2)
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  await settle(page)
  await page.waitForTimeout(900)
  for (const [name, sel, dy] of [['m-hero', null, 0], ['m-shop', '#tienda', 0], ['m-groom', '#peluqueria', 0], ['m-visit', '#nosotros', 120]]) {
    const y = sel ? await page.evaluate(([sel, dy]) => document.querySelector(sel).getBoundingClientRect().top + scrollY + dy, [sel, dy]) : 0
    await page.screenshot({ path: path.join(OUT, `${name}.png`), clip: { x: 0, y, width: 390, height: 844 }, fullPage: true })
  }
  await page.close()
}

// 4. banner, rendered with the site's own fonts and images
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 520 }, deviceScaleFactor: 1 })
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.setContent(
    `<!doctype html><html><head>${await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet],style')].map((n) => n.outerHTML).join(''))}
    <base href="${base}"><style>
      body{margin:0;width:1600px;height:520px;overflow:hidden;background:#f8f0e2;container-type:normal}
      .b{position:relative;width:1600px;height:520px}
      .b img.bg{position:absolute;right:0;top:0;height:520px;width:1000px;object-fit:cover;object-position:60% 40%;-webkit-mask-image:linear-gradient(90deg,transparent,#000 260px)}
      .b img.dog{position:absolute;right:120px;bottom:-56px;width:700px}
      .b .logo{position:absolute;left:70px;top:56px;width:120px}
      .b h1{position:absolute;left:220px;top:58px;margin:0;font:700 112px/0.86 'Fredoka Variable';color:#0c4929;letter-spacing:-.01em}
      .b h1 span{display:block}.b h1 .o{color:#f3911c}
      .b h1 span:nth-child(1){rotate:-6deg;transform-origin:0 80%}
      .b h1 span:nth-child(2){rotate:-4deg;transform-origin:0 80%}
      .b h1 span:nth-child(3){rotate:-2.5deg;transform-origin:0 80%}
      .b p{position:absolute;left:224px;top:420px;margin:0;font:600 26px 'Inter Variable';color:#173022}
      .b .note{position:absolute;left:690px;top:70px;font:24px/1.1 Kalam;color:#15241b;background:#fbf6ec;border:3px solid #15241b;border-radius:50%;padding:22px 26px;rotate:-9deg}
    </style></head><body><div class="b">
      <img class="bg" src="/img/cenario-v1-2400.webp"><img class="dog" src="/img/dog-wink-v1-1300.webp">
      <img class="logo" src="/img/logo-v1-400.webp">
      <h1><span>Para</span><span>gustos,</span><span class="o">patitas.</span></h1>
      <p>Pet shop y peluquería · Calle Floranes 40, Santander</p>
      <div class="note">Esto sí<br>me gusta.</div>
    </div></body></html>`,
    { waitUntil: 'networkidle' },
  )
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(OUT, 'banner.png') })
  await page.close()
}

await browser.close()
console.log('readme captures done')
