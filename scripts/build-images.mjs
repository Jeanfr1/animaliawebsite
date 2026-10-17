// Web images from the masters in assets-src/ (npm run prepare-images first).
//   npm run images  → public/img/<name>-v<V>-<width>.{avif,webp} + favicons
// Bump V whenever an image changes: /img is served with an immutable cache.
import { mkdir, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const V = 1
const SRC = 'assets-src'
const OUT = 'public/img'

// crop: [left, top, width, height] in master px (masters are x2/x4 of the kit files)
const jobs = [
  { name: 'cenario', src: 'cenario.png', widths: [1200, 1800, 2400, 3072], q: 62 },
  { name: 'dog-open', src: 'dog-open.png', widths: [800, 1300, 2000], q: 66, alpha: true },
  { name: 'dog-wink', src: 'dog-wink.png', widths: [800, 1300, 2000], q: 66, alpha: true },
  { name: 'snack', src: 'snack.png', widths: [320, 640], q: 70, alpha: true },
  { name: 'logo', src: 'logo.png', widths: [200, 400], q: 80, alpha: true },
  { name: 'shop', src: 'shop.png', widths: [900, 1600, 2400, 3152], q: 60 },
  { name: 'groom', src: 'groom.png', widths: [900, 1400, 2000, 2468], q: 62 },
  // facade master is x4 of the 792x904 photo: sign, awning, windows and door
  { name: 'facade', src: 'facade.png', crop: [0, 700, 3168, 1712], widths: [900, 1600, 2400, 3168], q: 60 },
  // phones: the full facade, portrait
  { name: 'facade-tall', src: 'facade.png', crop: [0, 380, 3168, 3236], widths: [700, 1100], q: 60 },
]

await mkdir(OUT, { recursive: true })
for (const f of await readdir(OUT)) await unlink(path.join(OUT, f))

for (const job of jobs) {
  let base = sharp(path.join(SRC, job.src))
  if (job.crop) {
    const [left, top, width, height] = job.crop
    base = base.extract({ left, top, width, height })
  }
  const buf = await base.png().toBuffer()
  const meta = await sharp(buf).metadata()
  for (const w of job.widths) {
    const width = Math.min(w, meta.width)
    const img = sharp(buf).resize({ width, withoutEnlargement: true })
    const stem = `${job.name}-v${V}-${width}`
    await img.clone().webp({ quality: job.q + 8, alphaQuality: 90, effort: 6 }).toFile(path.join(OUT, `${stem}.webp`))
    await img.clone().avif({ quality: job.q - 10, effort: 6 }).toFile(path.join(OUT, `${stem}.avif`))
  }
  console.log(job.name, `${meta.width}x${meta.height}`, job.widths.join(','))
}

// favicons + logo png for social/structured data
const logo = sharp(path.join(SRC, 'logo.png'))
await logo.clone().resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT, `icon-v${V}-512.png`))
await logo.clone().resize(180, 180, { fit: 'contain', background: '#f8f0e2' }).flatten({ background: '#f8f0e2' }).png().toFile(path.join(OUT, `apple-touch-icon-v${V}.png`))
await logo.clone().resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT, `favicon-v${V}-64.png`))
console.log('icons')
