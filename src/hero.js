// Hero entrance (06-roteiros/ANIMACAO.md, 07-integracao/timeline.json), 4.4 s, once:
//   0-1.2 s   the treat comes in from the right, near where the beagle looks
//   1.2-2.4 s short arc; the whole dog tilts a little (no part is deformed)
//   2.4-3.2 s crossfade open eyes -> wink (open pose stays opaque below), the note appears
//   3.2-4.4 s the treat settles where the board has it; everything holds
// The CSS default is the final frame, so no JS / reduced motion / a failed
// layer all show the board. Flags: ?static (final frame), ?t=<ms> (frozen at ms).
// State signal for tests: data-intro-state on the hero (playing|paused|done|static).

const DURATION = 4400

// offsets are in board px (multiplied by --u), angles in deg
const frames = {
  snack: [
    { offset: 0, x: 300, y: -70, r: 95, opacity: 0 },
    { offset: 0.1, x: 205, y: -78, r: 70, opacity: 1 },
    { offset: 0.27, x: -38, y: -78, r: 18, opacity: 1, easing: 'cubic-bezier(.3,.7,.4,1)' },
    { offset: 0.41, x: -58, y: -118, r: -6, opacity: 1, easing: 'cubic-bezier(.4,0,.6,1)' },
    { offset: 0.55, x: -6, y: -96, r: -22, opacity: 1, easing: 'cubic-bezier(.4,0,.6,1)' },
    { offset: 0.73, x: 12, y: -26, r: -8, opacity: 1, easing: 'cubic-bezier(.2,.8,.3,1)' },
    { offset: 0.86, x: -2, y: 4, r: 2, opacity: 1, easing: 'ease-in-out' },
    { offset: 1, x: 0, y: 0, r: 0, opacity: 1 },
  ],
  // the pose wrapper turns around the paws (transform-origin in CSS)
  dog: [
    { offset: 0, r: 2.2, y: 0 },
    { offset: 0.27, r: 1.8, y: 0, easing: 'ease-in-out' },
    { offset: 0.41, r: -0.6, y: -10, easing: 'ease-in-out' },
    { offset: 0.55, r: 0.5, y: -4, easing: 'ease-in-out' },
    { offset: 0.73, r: -0.2, y: 0, easing: 'ease-out' },
    { offset: 1, r: 0, y: 0 },
  ],
}

export function initHero(root = document) {
  const hero = root.querySelector('[data-hero]')
  if (!hero) return
  const html = document.documentElement
  clearTimeout(window.__introFailsafe)

  const $ = (s) => hero.querySelector(s)
  const snack = $('[data-snack]')
  const bone = $('[data-snack-bone]')
  const pose = $('[data-dog-pose]')
  const wink = $('.hero__dog-img--wink')
  const bubble = $('[data-bubble]')
  const spark = $('[data-spark]')
  const controls = $('[data-controls]')
  const replayBtn = $('[data-replay]')
  const pauseBtn = $('[data-pause]')
  const layers = [...hero.querySelectorAll('[data-layer]')]

  const params = new URLSearchParams(location.search)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let animations = []
  let state = 'static'

  const setState = (s) => {
    state = s
    hero.dataset.introState = s
    const icon = pauseBtn.querySelector('use')
    if (s === 'paused') {
      pauseBtn.setAttribute('aria-label', 'Continuar animación')
      pauseBtn.setAttribute('aria-pressed', 'true')
      icon.setAttribute('href', '#i-play')
    } else {
      pauseBtn.setAttribute('aria-label', s === 'done' ? 'Animación finalizada' : 'Pausar animación')
      pauseBtn.setAttribute('aria-pressed', 'false')
      icon.setAttribute('href', '#i-pause')
    }
    pauseBtn.disabled = s === 'done'
  }

  const showFinal = () => {
    animations.forEach((a) => a.cancel())
    animations = []
    html.removeAttribute('data-intro')
  }

  const unit = () => parseFloat(getComputedStyle(snack).getPropertyValue('width')) / 205

  const build = () => {
    const u = unit()
    const timing = { duration: DURATION, fill: 'both', easing: 'linear' }
    const snackMove = snack.animate(
      frames.snack.map(({ offset, x, y, opacity, easing }) => ({
        offset,
        opacity,
        transform: `translate(${x * u}px, ${y * u}px)`,
        ...(easing && { easing }),
      })),
      timing,
    )
    const snackTurn = bone.animate(
      frames.snack.map(({ offset, r, easing }) => ({ offset, transform: `rotate(${r}deg)`, ...(easing && { easing }) })),
      timing,
    )
    // pose lives inside the dog layer, scaled 0.414: 1 board px = u / 0.414 local px
    const dogTilt = pose.animate(
      frames.dog.map(({ offset, r, y, easing }) => ({
        offset,
        transform: `translateY(${(y * u) / 0.41447}px) rotate(${r}deg)`,
        ...(easing && { easing }),
      })),
      timing,
    )
    const winkIn = wink.animate(
      [
        { offset: 0, opacity: 0 },
        { offset: 0.545, opacity: 0 },
        { offset: 0.64, opacity: 1 },
        { offset: 1, opacity: 1 },
      ],
      timing,
    )
    const noteIn = bubble.animate(
      [
        { offset: 0, opacity: 0, transform: 'translateY(8px) scale(.86) rotate(-5deg)' },
        { offset: 0.56, opacity: 0, transform: 'translateY(8px) scale(.86) rotate(-5deg)', easing: 'cubic-bezier(.2,1.4,.4,1)' },
        { offset: 0.72, opacity: 1, transform: 'none' },
        { offset: 1, opacity: 1, transform: 'none' },
      ],
      timing,
    )
    const sparkIn = spark.animate(
      [
        { offset: 0, opacity: 0, transform: 'scale(.4)' },
        { offset: 0.74, opacity: 0, transform: 'scale(.4)', easing: 'cubic-bezier(.2,1.5,.4,1)' },
        { offset: 0.84, opacity: 1, transform: 'none' },
        { offset: 1, opacity: 1, transform: 'none' },
      ],
      timing,
    )
    animations = [snackMove, snackTurn, dogTilt, winkIn, noteIn, sparkIn]
    snackMove.finished.then(() => setState('done')).catch(() => {})
  }

  const play = () => {
    animations.forEach((a) => a.cancel())
    build()
    html.removeAttribute('data-intro')
    setState('playing')
  }

  const seek = (ms) => {
    animations.forEach((a) => a.cancel())
    build()
    animations.forEach((a) => {
      a.pause()
      a.currentTime = Math.max(0, Math.min(DURATION, ms))
    })
    html.removeAttribute('data-intro')
    setState('paused')
  }

  replayBtn.addEventListener('click', play)
  pauseBtn.addEventListener('click', () => {
    if (state === 'playing') {
      animations.forEach((a) => a.pause())
      setState('paused')
    } else if (state === 'paused') {
      animations.forEach((a) => a.play())
      setState('playing')
    }
  })

  reduced.addEventListener?.('change', () => {
    if (reduced.matches) {
      showFinal()
      controls.hidden = true
      setState('static')
    } else {
      controls.hidden = false
      setState('done')
    }
  })

  if (params.has('static') || reduced.matches || !('animate' in Element.prototype)) {
    showFinal()
    setState('static')
    return
  }

  const ready = (img) =>
    img.decode
      ? img.decode()
      : new Promise((ok, no) => {
          if (img.complete) return img.naturalWidth ? ok() : no()
          img.addEventListener('load', ok, { once: true })
          img.addEventListener('error', no, { once: true })
        })

  // give the layers up to 2.5 s; a slow or failed layer keeps the final frame
  const timeout = new Promise((_, no) => setTimeout(() => no(new Error('slow')), 2500))
  Promise.race([Promise.all(layers.map(ready)), timeout])
    .then(() => {
      controls.hidden = false
      if (params.has('t')) seek(Number(params.get('t')) || 0)
      else play()
    })
    .catch(() => {
      showFinal()
      setState('static')
    })
}
