// Splits the verified source data in /data into small files the app loads on demand:
//   public/data/quran-meta.json   surah names, ayah counts, page of every ayah, juz starts (~50 KB)
//   public/data/surah/{n}.json    Arabic (Quran.com text_uthmani) + Somali (translation id 46) for one surah
//   public/data/hisn-index.json   Hisn al-Muslim chapter titles + counts
//   public/data/hisn/{id}.json    one Hisn al-Muslim chapter (Arabic, counts, Somali meaning, references)
// The text is copied byte-for-byte; nothing is edited here.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const q = JSON.parse(await readFile(path.join(root, 'data/quran.json'), 'utf8'))
const out = path.join(root, 'public/data')
await mkdir(path.join(out, 'surah'), { recursive: true })

const meta = {
  source: q.source,
  juz: q.juz,
  surahs: q.surahs.map(({ n, name, ar, ayahs, place, page, p }) => ({ n, name, ar, ayahs, place, page, p })),
}
await writeFile(path.join(out, 'quran-meta.json'), JSON.stringify(meta))
for (const s of q.surahs) await writeFile(path.join(out, 'surah', `${s.n}.json`), JSON.stringify({ n: s.n, v: s.v }))
const hisn = JSON.parse(await readFile(path.join(root, 'data/hisn.json'), 'utf8'))
await mkdir(path.join(out, 'hisn'), { recursive: true })
const ch27 = hisn.chapters.find((c) => c.id === 27).items
const index = {
  source: hisn.source,
  // Hisn keeps morning and evening in chapter 27; the split uses the book's own markers
  counts: { subax: ch27.filter((i) => !i.ev).length, fiid: ch27.filter((i) => !i.mo).length },
  chapters: hisn.chapters.map((c) => ({ id: c.id, title: c.title, en: c.en, count: c.items.length })),
}
await writeFile(path.join(out, 'hisn-index.json'), JSON.stringify(index))
for (const c of hisn.chapters) await writeFile(path.join(out, 'hisn', `${c.id}.json`), JSON.stringify({ id: c.id, items: c.items }))
console.log(`data: quran meta + ${q.surahs.length} surah files, hisn index + ${hisn.chapters.length} chapter files`)
