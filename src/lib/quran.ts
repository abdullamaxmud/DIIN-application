import type { QuranData, Surah, SurahText } from './data'

export interface LastRead {
  s: number
  a: number
  page: number
  name: string
  ar: string
  at: number
}

/** Eastern Arabic digits for ayah medallions: 12 -> ١٢ */
export const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

export const placeSo = (p: Surah['place']) => (p === 'makkah' ? 'Makki' : 'Madani')

const stripHarakat = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/^ال/, '')

/** Surah search: number, Latin name (punctuation-insensitive) or Arabic name (diacritics-insensitive). */
export function searchSurahs(surahs: Surah[], query: string): Surah[] {
  const q = query.trim().toLowerCase()
  if (!q) return surahs
  if (/^\d+$/.test(q)) return surahs.filter((s) => String(s.n) === q)
  const latin = q.replace(/[^a-z]/g, '')
  const arabic = /[؀-ۿ]/.test(q) ? stripHarakat(q) : ''
  return surahs.filter(
    (s) =>
      (latin && s.name.toLowerCase().replace(/[^a-z]/g, '').includes(latin)) ||
      (arabic && stripHarakat(s.ar).includes(arabic)),
  )
}

export const parseKey = (key: string) => key.split(':').map(Number) as [number, number]

/** "Hud 6" style label for the first ayah of juz n (1-based). */
export function juzStart(q: QuranData, n: number): { s: number; a: number; label: string } {
  const [s, a] = parseKey(q.juz[n - 1].key)
  return { s, a, label: `${q.surahs[s - 1].name} ${a}` }
}

/** Last ayah of juz n, e.g. juz 12 -> "Yusuf 52". */
export function juzEnd(q: QuranData, n: number): string {
  if (n >= 30) return `${q.surahs[113].name} ${q.surahs[113].ayahs}`
  const [s, a] = parseKey(q.juz[n].key)
  return a > 1 ? `${q.surahs[s - 1].name} ${a - 1}` : `${q.surahs[s - 2].name} ${q.surahs[s - 2].ayahs}`
}

/** Page range "222–241" for juz n. */
export function juzPages(q: QuranData, n: number): [number, number] {
  return [q.juz[n - 1].page, n >= 30 ? 604 : q.juz[n].page - 1]
}

/**
 * The mushaf shows the basmala above every surah except Al-Fatihah (where it is ayah 1)
 * and At-Tawbah. The text shown is Quran.com's own text_uthmani of 1:1 — never typed by hand.
 */
export const showsBasmala = (surah: number) => surah !== 1 && surah !== 9
export const basmalaText = (fatiha: SurahText) => fatiha.v[0][0]

export function lastReadFor(q: QuranData, s: number, a: number): LastRead {
  const sur = q.surahs[s - 1]
  return { s, a, page: sur.p[a - 1] ?? sur.page, name: sur.name, ar: sur.ar, at: Date.now() }
}
