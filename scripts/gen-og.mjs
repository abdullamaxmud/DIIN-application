// Generates public/og-image.png (1200×630): the picture shown when a DIIN link is shared
// (WhatsApp, Facebook, X, Telegram) and that search engines may use. Run: npm run og
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(root, '../public/og-image.png')

// eight-point star tile, same motif as the app headers
const tile = `<pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse">
  <path d="M36 3 L45 27 L69 36 L45 45 L36 69 L27 45 L3 36 L27 27 Z" fill="none" stroke="#E9D49E" stroke-width="1.1"/>
  <circle cx="36" cy="36" r="4" fill="none" stroke="#E9D49E" stroke-width="1.1"/></pattern>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="95%">
      <stop offset="0" stop-color="#145A45"/><stop offset=".5" stop-color="#0D3B2E"/><stop offset="1" stop-color="#071F19"/>
    </radialGradient>
    ${tile}
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#p)" opacity=".08"/>
  <g transform="translate(250 315)">
    <circle r="150" fill="#E9D49E" fill-opacity=".06" stroke="#C9A34E" stroke-opacity=".45" stroke-width="2"/>
    <circle r="178" fill="none" stroke="#C9A34E" stroke-opacity=".14" stroke-width="22"/>
    <g fill="none" stroke="#C9A34E" stroke-width="7" stroke-linejoin="round">
      <rect x="-70" y="-70" width="140" height="140"/>
      <rect x="-70" y="-70" width="140" height="140" transform="rotate(45)"/>
    </g>
    <circle r="22" fill="#E9D49E"/>
  </g>
  <g font-family="Georgia, 'Times New Roman', serif" fill="#F6F1E6">
    <text x="500" y="250" font-size="118" font-weight="600" letter-spacing="30">DIIN</text>
    <text x="504" y="330" font-size="40" font-style="italic" fill="#E9D49E">Quraanka · Adkaarta · Salaadda</text>
  </g>
  <g font-family="'Segoe UI', Arial, sans-serif" font-weight="700">
    <text x="504" y="400" font-size="25" fill="#C9D6CF">Khatmi, Wird, Xisnul Muslim iyo waqtiyada salaadda</text>
    <rect x="504" y="440" width="300" height="56" rx="28" fill="#C9A34E"/>
    <text x="654" y="477" font-size="26" fill="#071F19" text-anchor="middle">Af-Soomaali · Bilaash</text>
  </g>
</svg>`

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out)
console.log('og image written to public/og-image.png')
