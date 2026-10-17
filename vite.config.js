import { defineConfig } from 'vite'
import { site } from './src/data/site.js'
import { tornPolygon } from './src/torn.js'

// Build-time HTML: shop facts from src/data/site.js ({{path}} tokens) and the
// torn-paper outlines (data-torn → inline clip-path), so the page reads and
// looks right without JS.
function animaliaHtml() {
  const lookup = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), site)
  const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  return {
    name: 'animalia-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        html = html.replace(/\{\{services\}\}/g, () => site.services.map((s) => `<li>${escape(s)}</li>`).join(''))
        html = html.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (m, path) => {
          const v = lookup(path)
          if (v == null || typeof v === 'object') throw new Error(`index.html: unknown token ${m}`)
          return escape(v)
        })
        // data-torn="w h seed amp sides" (board px, sides = any of t r b l)
        html = html.replace(/data-torn="([^"]+)"/g, (m, spec) => {
          const [w, h, seed, amp, sides = 'trbl'] = spec.trim().split(/\s+/)
          const poly = tornPolygon(+w, +h, +seed, +amp, sides)
          return `${m} style="clip-path:${poly}"`
        })
        return html
      },
    },
  }
}

export default defineConfig({
  plugins: [animaliaHtml()],
  build: {
    assetsInlineLimit: 0,
    cssCodeSplit: false,
  },
})
