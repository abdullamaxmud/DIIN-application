// Generates the PWA PNG icons from public/favicon.svg (run: npm run icons).
import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const svg = await readFile(path.join(root, '../public/favicon.svg'))
const out = path.join(root, '../public/icons')
await mkdir(out, { recursive: true })

const plain = (size, name) => sharp(svg).resize(size, size).png().toFile(path.join(out, name))

// maskable: full-bleed square (no rounded tile — the OS applies its own mask),
// with the star kept inside the 80% safe zone
const maskableSvg = Buffer.from(
  svg.toString()
    .replace('rx="112"', 'rx="0"')
    .replace('<g transform="translate(256 256)"', '<g transform="translate(256 256) scale(0.82)"')
    .replace('r="40" fill', 'r="33" fill'),
)
const maskable = (size, name) => sharp(maskableSvg).resize(size, size).png().toFile(path.join(out, name))

await plain(192, 'icon-192.png')
await plain(512, 'icon-512.png')
await plain(180, 'apple-touch-icon.png')
await maskable(512, 'maskable-512.png')
console.log('icons written to public/icons')
