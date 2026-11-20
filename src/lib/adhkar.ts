import type { Dhikr, HisnData, HisnIndex } from './data'

// Somali names for the everyday categories (UI labels — flagged for native-speaker review).
// The adhkar themselves, their counts and their Somali meanings come only from hisn.json.
export const CATEGORY_SO: Record<string, string> = {
  subax: 'Adkaarta Subaxa', fiid: 'Adkaarta Fiidka',
  28: 'Adkaarta hurdada', 1: 'Toosidda hurdada', 29: 'Marka habeenkii la rogrogmado', 30: 'Cabsida hurdada iyo cidlada', 31: 'Marka riyo la arko',
  12: 'U socodka masjidka', 13: 'Galitaanka masjidka', 14: 'Ka bixitaanka masjidka', 15: 'Aadaanka', 25: 'Salaadda kadib', 32: 'Qunuutka witirka', 33: 'Witirka kadib', 26: 'Salaadda istikhaarada',
  6: 'Galitaanka musqusha', 7: 'Ka bixitaanka musqusha', 8: 'Wuduuga ka hor', 9: 'Wuduuga kadib', 10: 'Ka bixitaanka guriga', 11: 'Galitaanka guriga', 2: 'Xidhashada dharka',
  95: 'Fuulista gaadiidka', 96: 'Ducada safarka', 97: 'Galitaanka magaalo ama tuulo', 98: 'Galitaanka suuqa', 101: 'Nagadhaafidda musaafirka', 104: 'Marka meel la dego', 105: 'Ka soo noqoshada safarka',
  69: 'Cuntada ka hor', 70: 'Cuntada kadib', 68: 'Afurka soonka', 71: 'Ducada martida',
  34: 'Walwalka iyo murugada', 35: 'Dhibaatada culus', 41: 'Bixinta deynta', 43: 'Marka arrin adkaato', 53: 'Marka musiibo dhacdo', 82: 'Cadhada', 45: 'Ka fogeynta shaydaanka',
  129: 'Istighfaarka iyo toobadda', 130: 'Fadliga tasbiixa iyo tahliilka', 85: 'Kafaaradda majliska', 77: 'Hindhisada', 67: 'Arkidda bisha cusub',
}

export const GROUPS: [string, number[]][] = [
  ['Habeenka iyo hurdada', [28, 1, 29, 30, 31]],
  ['Salaadda iyo masjidka', [12, 13, 14, 15, 25, 32, 33, 26]],
  ['Guriga, musqusha iyo wuduuga', [6, 7, 8, 9, 10, 11, 2]],
  ['Safarka', [95, 96, 97, 98, 101, 104, 105]],
  ['Cuntada', [69, 70, 68, 71]],
  ['Walwalka iyo dhibaatada', [34, 35, 41, 43, 53, 82, 45]],
  ['Maalinlaha kale', [129, 130, 85, 77, 67]],
]

/**
 * Items of a category. Hisn al-Muslim keeps morning and evening adhkar in one chapter (27);
 * the split uses the book's own markers ("إذا أصبح" = morning only, "إذا أمسى" = evening only).
 */
export function itemsFor(h: HisnData, key: string): Dhikr[] {
  const ch = (id: number) => h.chapters.find((c) => c.id === id)
  if (key === 'subax') return ch(27)!.items.filter((i) => !i.ev)
  if (key === 'fiid') return ch(27)!.items.filter((i) => !i.mo)
  return ch(Number(key))?.items ?? []
}

export function titleFor(h: HisnData | HisnIndex, key: string): string {
  return CATEGORY_SO[key] ?? h.chapters.find((c) => String(c.id) === key)?.title ?? key
}

/** Which chapter file a category lives in (morning/evening share chapter 27). */
export const chapterIdFor = (key: string) => (key === 'subax' || key === 'fiid' ? 27 : Number(key))

/** Same split as itemsFor(), applied to an already-loaded chapter. */
export function itemsInChapter(items: Dhikr[], key: string): Dhikr[] {
  if (key === 'subax') return items.filter((i) => !i.ev)
  if (key === 'fiid') return items.filter((i) => !i.mo)
  return items
}

/**
 * Which daily adhkar fit right now: morning from Fajr until Asr, evening from Asr until the next Fajr.
 * With today's prayer times (GPS on) those are used; without them, 04:00 and 15:00 local time.
 */
export function adhkarTimeFor(now: Date, today?: { fajr: Date; asr: Date } | null): 'subax' | 'fiid' {
  if (today) return now >= today.fajr && now < today.asr ? 'subax' : 'fiid'
  const h = now.getHours()
  return h >= 4 && h < 15 ? 'subax' : 'fiid'
}
