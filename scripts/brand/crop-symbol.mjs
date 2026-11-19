import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const publicDir = resolve(root, 'apps/web/public')
const symbolPath = resolve(publicDir, 'brand/ninbi-symbol.png')
await mkdir(dirname(symbolPath), { recursive: true })
const symbol = await sharp(resolve(root, 'brand/ninbi-compass.svg'), {
  density: 384,
})
  .resize(256, 256)
  .png()
  .toBuffer()
await sharp(symbol).toFile(symbolPath)
await sharp(symbol)
  .resize(64, 64)
  .png()
  .toFile(resolve(publicDir, 'favicon.png'))
