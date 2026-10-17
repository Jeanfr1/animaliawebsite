import '@fontsource-variable/fredoka/wdth.css'
import '@fontsource-variable/inter/wght.css'
import '@fontsource/kalam/400.css'
import '@fontsource/kalam/700.css'
import './styles.css'
import { initHero } from './hero.js'

initHero()

// mobile menu
const header = document.querySelector('[data-header]')
const toggle = document.querySelector('[data-menu-toggle]')
const closeMenu = () => {
  header.classList.remove('menu-open')
  toggle.setAttribute('aria-expanded', 'false')
}
toggle.addEventListener('click', () => {
  const open = header.classList.toggle('menu-open')
  toggle.setAttribute('aria-expanded', String(open))
})
header.querySelectorAll('.nav__link').forEach((a) => a.addEventListener('click', closeMenu))
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && header.classList.contains('menu-open')) {
    closeMenu()
    toggle.focus()
  }
})
matchMedia('(min-width: 900px)').addEventListener?.('change', closeMenu)

// current section in the nav
const links = [...document.querySelectorAll('.nav__link')]
const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]))
if ('IntersectionObserver' in window) {
  const seen = new Map()
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio))
      let best = null
      for (const [id, r] of seen) if (!best || r > best[1]) best = [id, r]
      if (!best || best[1] === 0) return
      links.forEach((a) => a.removeAttribute('aria-current'))
      byId.get(best[0])?.setAttribute('aria-current', 'page')
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  )
  ;['inicio', 'tienda', 'peluqueria', 'nosotros', 'contacto'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) io.observe(el)
  })
}

// papers settle in (14px + fade); the hidden state belongs to this block only
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
if ('IntersectionObserver' in window && !reduced) {
  const papers = [...document.querySelectorAll('.paper-wrap')]
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }),
    { threshold: 0.15 },
  )
  document.documentElement.classList.add('reveal-on')
  papers.forEach((p) => {
    // already on screen at load: no animation
    if (p.getBoundingClientRect().top < innerHeight) p.classList.add('is-in')
    io.observe(p)
  })
}
