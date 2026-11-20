// Loaders for the verified religious data shipped in /public/data.
// quran-meta.json + surah/{n}.json : Quran.com API v4 — text_uthmani (Hafs), Somali translation id 46
//              (Mahmud Muhammad Abduh), page numbers. Split from /data/quran.json by scripts/build-data.mjs.
// hisn-index.json + hisn/{id}.json : Hisn al-Muslim — hisnmuslim.com official API (Arabic + counts) and the published Somali
//              translation "Xisnul Muslim – Dhufeyska Muslinka" (islamic-invitation.com), matched by number.
// Nothing in these files is generated or translated by AI.

export interface Surah {
  n: number
  name: string
  ar: string
  ayahs: number
  place: 'makkah' | 'madinah'
  page: number
  /** page number of each ayah (Madani 604-page mushaf) */
  p: number[]
}

/** One surah's text: [arabic, somali] per ayah (loaded only when the surah is opened). */
export interface SurahText {
  n: number
  v: [string, string][]
}

export interface QuranData {
  source: Record<string, string>
  juz: { n: number; key: string; page: number }[]
  surahs: Surah[]
}

export interface Dhikr {
  /** Hisn al-Muslim number */
  n: number
  /** Arabic text */
  t: string
  /** repetitions */
  c: number
  /** 1 when the count was taken from the book's own text (API field omitted it) */
  fx: number
  /** English meaning (hisnmuslim.com) */
  e: string
  /** 1 = morning only, 1 = evening only (from the book's own markers) */
  mo: number
  ev: number
  /** Somali meaning from "Dhufeyska Muslinka" (absent for Quran passages the book leaves untranslated) */
  so?: string
  /** the book's Somali transliteration */
  st?: string
  /** hadith reference from the book's end-notes */
  rf?: string
}

export interface HisnIndex {
  source: string
  counts: { subax: number; fiid: number }
  chapters: { id: number; title: string; en: string; count: number }[]
}

export interface HisnChapter {
  id: number
  items: Dhikr[]
}

export interface HisnData {
  source: string
  chapters: { id: number; title: string; en: string; items: Dhikr[] }[]
}

const cache = new Map<string, Promise<unknown>>()

function load<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`)
        return r.json()
      }),
    )
  }
  return cache.get(url) as Promise<T>
}

export const loadQuran = () => load<QuranData>('/data/quran-meta.json')
export const loadSurah = (n: number) => load<SurahText>(`/data/surah/${n}.json`)
export const loadHisnIndex = () => load<HisnIndex>('/data/hisn-index.json')
export const loadHisnChapter = (id: number) => load<HisnChapter>(`/data/hisn/${id}.json`)
