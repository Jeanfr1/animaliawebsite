// QA against the production build (npm run build && npm run preview → :4197).
//   npm run qa                      local preview
//   QA_BASE=https://… npm run qa    live site
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const base = process.env.QA_BASE || 'http://localhost:4197/'
const results = []
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  — ${info}` : ''}`)
}

const browser = await chromium.launch({ channel: 'chrome' })

const walk = async (page) =>
  page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 350) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 140))
    }
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))))
    scrollTo(0, 0)
  })

// 1. widths: no horizontal overflow, every image decoded, no console errors
for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [900, 800], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1300]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  const failed = []
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`))
  await page.goto(base, { waitUntil: 'networkidle' })
  await walk(page)
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: innerWidth,
    broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src),
    wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 && getComputedStyle(e).position !== 'fixed').slice(0, 4).map((e) => e.tagName + '.' + e.className),
  }))
  check(`${w}px no horizontal overflow`, m.sw === m.iw, m.sw !== m.iw ? `${m.sw} vs ${m.iw} ${m.wide.join(' ')}` : '')
  check(`${w}px images decoded`, m.broken.length === 0, m.broken.join(' '))
  check(`${w}px no console errors / failed requests`, errors.length + failed.length === 0, [...errors, ...failed].slice(0, 3).join(' | '))
  await page.close()
}

// 2. hero intro plays once and ends on the board frame; controls work
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(base)
  await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.introState === 'playing', null, { timeout: 8000 })
  check('intro starts', true)
  check('controls visible while motion is on', await page.isVisible('[data-controls]'))
  await page.click('[data-pause]')
  check('pause pauses', (await page.getAttribute('[data-hero]', 'data-intro-state')) === 'paused')
  check('pause button announces Continuar', (await page.getAttribute('[data-pause]', 'aria-label')) === 'Continuar animación')
  await page.click('[data-pause]')
  await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.introState === 'done', null, { timeout: 8000 })
  check('intro ends (done)', true)
  const fin = await page.evaluate(() => {
    const op = (s) => +getComputedStyle(document.querySelector(s)).opacity
    return { snack: op('[data-snack]'), wink: op('.hero__dog-img--wink'), bubble: op('[data-bubble]') }
  })
  check('final frame: treat, wink and note visible', fin.snack === 1 && fin.wink === 1 && fin.bubble === 1, JSON.stringify(fin))
  check('pause disabled when finished', await page.isDisabled('[data-pause]'))
  await page.click('[data-replay]')
  check('replay restarts', (await page.getAttribute('[data-hero]', 'data-intro-state')) === 'playing')
  await page.close()
}

// 3. reduced motion: board frame at once, no controls
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await page.goto(base, { waitUntil: 'networkidle' })
  const s = await page.evaluate(() => ({
    state: document.querySelector('[data-hero]').dataset.introState,
    intro: document.documentElement.getAttribute('data-intro'),
    controls: document.querySelector('[data-controls]').hidden,
    snack: getComputedStyle(document.querySelector('[data-snack]')).opacity,
  }))
  check('reduced motion: static final frame', s.state === 'static' && s.intro === null && s.controls && s.snack === '1', JSON.stringify(s))
  await page.close()
}

// 4. no JS: final frame + every contact readable in the HTML
{
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(base, { waitUntil: 'networkidle' })
  const s = await page.evaluate(() => ({
    snack: getComputedStyle(document.querySelector('[data-snack]')).opacity,
    wink: getComputedStyle(document.querySelector('.hero__dog-img--wink')).opacity,
    text: document.body.innerText,
    styled: getComputedStyle(document.body).backgroundColor,
  }))
  check('no JS: styled page', s.styled === 'rgb(248, 240, 226)', s.styled)
  check('no JS: final frame visible', s.snack === '1' && s.wink === '1')
  for (const t of ['Calle Floranes 40', '686 16 37 99', '@animalia_santander', 'Baño y corte para gatos', 'Para gustos', 'Mimos que']) check(`no JS: "${t}" in page`, s.text.includes(t))
  await ctx.close()
}

// 5. JS bundle fails: the boot failsafe still shows the final frame
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.route('**/assets/*.js', (r) => r.abort())
  await page.goto(base)
  await page.waitForTimeout(4200)
  const s = await page.evaluate(() => ({ intro: document.documentElement.getAttribute('data-intro'), snack: getComputedStyle(document.querySelector('[data-snack]')).opacity }))
  check('bundle blocked: failsafe reveals the final frame', s.intro === null && s.snack === '1', JSON.stringify(s))
  await page.close()
}

// 6. links and CTAs (real pointer clicks; external ones open a new tab)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')))
  check('WhatsApp links', hrefs.filter((h) => h === 'https://wa.link/j75mpv').length >= 4)
  check('tel link', hrefs.includes('tel:+34686163799'))
  check('Instagram link', hrefs.includes('https://www.instagram.com/animalia_santander/'))
  check('Maps link', hrefs.some((h) => h.startsWith('https://www.google.com/maps/')))
  for (const sel of ['.btn--header', '.btn--hero', '.btn--groom', '.btn--visit-map']) {
    await page.locator(sel).scrollIntoViewIfNeeded()
    const [popup] = await Promise.all([page.waitForEvent('popup', { timeout: 5000 }).catch(() => null), page.click(sel, { noWaitAfter: true })])
    check(`click ${sel} opens a new tab`, !!popup, popup ? new URL(popup.url()).host : '')
    if (popup) await popup.close()
  }
  for (const [sel, id] of [['.btn--visit', 'nosotros'], ['.nav__link--groom', 'peluqueria'], ['.nav__link--shop', 'tienda'], ['.nav__link--contact', 'contacto'], ['.btn--shop', 'nosotros']]) {
    await page.evaluate(() => scrollTo(0, 0))
    await page.locator(sel).scrollIntoViewIfNeeded()
    await page.click(sel)
    await page.waitForTimeout(900)
    const r = await page.evaluate((id) => {
      const b = document.getElementById(id).getBoundingClientRect()
      return { top: b.top, bottom: b.bottom, end: Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1 }
    }, id)
    // the footer can't reach the top: at the end of the page it must be fully in view
    const ok = Math.abs(r.top) < 80 || (r.end && r.top >= 0 && r.bottom <= 901)
    check(`click ${sel} reaches #${id}`, ok, `top ${r.top.toFixed(0)}`)
  }
  await page.close()
}

// 7. phone menu
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(base, { waitUntil: 'networkidle' })
  check('phone: nav hidden by default', !(await page.isVisible('#nav')))
  await page.click('[data-menu-toggle]')
  check('phone: menu opens', (await page.isVisible('#nav')) && (await page.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true')
  await page.keyboard.press('Escape')
  check('phone: Escape closes', !(await page.isVisible('#nav')))
  await page.click('[data-menu-toggle]')
  await page.click('.nav__link--groom')
  await page.waitForTimeout(900)
  const top = await page.evaluate(() => document.getElementById('peluqueria').getBoundingClientRect().top)
  check('phone: menu link reaches #peluqueria and closes', Math.abs(top) < 80 && !(await page.isVisible('#nav')), `top ${top.toFixed(0)}`)
  await page.close()
}

// 7b. notes and stickers never cover text (06-roteiros/SECOES.md), measured on ink:
// screenshots of each note's box with notes/texts toggled; overlap = pixels that
// are both text ink and note ink.
const NOTES = ['.groom__stamp', '.shop__note', '.bubble', '.sticker', '.groom__scissors', '.visit__pin', '.spark--shop', '.spark--title', '.groom__mini-heart', '.star']
const TEXTS = 'h1, h2, .copy, .btn, .visit__address, .hero__sub, .perks'
for (const w of [360, 390, 430, 1024, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } })
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: `.qa-nt :is(${TEXTS}){visibility:hidden!important}.qa-nn :is(${NOTES.join(',')}){visibility:hidden!important}` })
  const hits = []
  for (const sel of NOTES) {
    const rects = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height } }), sel)
    for (const r of rects) {
      const clip = { x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)), width: Math.ceil(Math.min(r.w, w - r.x)), height: Math.ceil(r.h) }
      if (clip.width < 2 || clip.height < 2) continue
      const shot = async (cls) => {
        await page.evaluate((cls) => (document.documentElement.className = cls), cls)
        return sharp(await page.screenshot({ clip, fullPage: true })).removeAlpha().raw().toBuffer()
      }
      const both = await shot('qa-nn')       // texts only
      const none = await shot('qa-nn qa-nt') // neither
      const note = await shot('qa-nt')       // note only
      let n = 0
      for (let i = 0; i < none.length; i += 3) {
        const d = (a) => Math.abs(a[i] - none[i]) + Math.abs(a[i + 1] - none[i + 1]) + Math.abs(a[i + 2] - none[i + 2])
        if (d(both) > 90 && d(note) > 90) n++
      }
      if (n > 12) hits.push(`${sel} (${n}px)`)
    }
  }
  await page.evaluate(() => (document.documentElement.className = ''))
  check(`${w}px notes don't cover text (ink)`, hits.length === 0, hits.join(' | '))
  await page.close()
}

// 8. copy hygiene: no production notes in text or alt
{
  const page = await browser.newPage()
  await page.goto(new URL('?static', base).href, { waitUntil: 'networkidle' })
  const text = await page.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[alt]')].map((i) => i.alt).join(' '))
  const bad = [
    ...(text.match(/\b(conceptual|ilustrativ\w*|generad\w*|editad\w*|original|campaña|maqueta|mockup|confirmar)\b/gi) || []),
    ...(text.match(/\b(TODO|IA|AI)\b/g) || []),
  ]
  if (!bad.length) bad.length = 0
  check('no production notes in copy or alt text', bad.length === 0, [...new Set(bad)].join(', '))
  const h1 = await page.locator('h1').count()
  check('one h1', h1 === 1)
  const noAlt = await page.evaluate(() => [...document.images].filter((i) => !i.hasAttribute('alt')).length)
  check('every img has alt', noAlt === 0)
  await page.close()
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
