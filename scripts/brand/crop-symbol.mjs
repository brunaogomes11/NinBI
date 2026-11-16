import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = resolve(root, 'brand', 'ninbi-logo.jpg')
const symbolOut = resolve(
  root,
  'apps',
  'web',
  'public',
  'brand',
  'ninbi-symbol.png',
)
const faviconOut = resolve(root, 'apps', 'web', 'public', 'favicon.png')

// Star region of the 2000 px wide logo: left, top, width, height.
const crop = { left: 230, top: 240, width: 680, height: 640 }

const { data, info } = await sharp(source)
  .extract(crop)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

// The top-left corner of the crop is plain background: its mean colour is the backdrop.
const backdropStats = await sharp(source)
  .extract({ left: crop.left + 4, top: crop.top + 4, width: 16, height: 16 })
  .stats()
const backdrop = backdropStats.channels
  .slice(0, 3)
  .map((channel) => channel.mean)
const threshold = Math.max(...backdrop) + 4

// Alpha rises from the backdrop level to full brightness; colour is un-mixed from the backdrop.
for (let i = 0; i < data.length; i += 4) {
  const max = Math.max(data[i], data[i + 1], data[i + 2])
  const alpha = Math.min(1, Math.max(0, (max - threshold) / (255 - threshold)))
  if (alpha === 0) {
    data[i] = 0
    data[i + 1] = 0
    data[i + 2] = 0
    data[i + 3] = 0
    continue
  }
  for (let c = 0; c < 3; c++) {
    const unmixed = (data[i + c] - (1 - alpha) * backdrop[c]) / alpha
    data[i + c] = Math.min(255, Math.max(0, Math.round(unmixed)))
  }
  data[i + 3] = Math.round(alpha * 255)
}

const symbol = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .resize(256, 256, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()

await mkdir(dirname(symbolOut), { recursive: true })
await sharp(symbol).toFile(symbolOut)
await sharp(symbol).resize(64, 64).png().toFile(faviconOut)

console.log(`ok ${symbolOut}`)
console.log(`ok ${faviconOut}`)
