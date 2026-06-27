import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import sharp from 'sharp'
import toIco from 'to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(__dirname, '../resources/icon.svg'))

const sizes = [16, 24, 32, 48, 64, 128, 256]

console.log('Rendering SVG to PNG sizes:', sizes.join(', '))
const pngs = await Promise.all(
  sizes.map((size) =>
    sharp(svg, { density: 300 })
      .resize(size, size)
      .png()
      .toBuffer()
  )
)

const ico = await toIco(pngs)
const outPath = join(__dirname, '../resources/icon.ico')
writeFileSync(outPath, ico)
console.log('Done →', outPath)
