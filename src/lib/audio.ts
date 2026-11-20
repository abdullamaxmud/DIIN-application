// Quran recitations from Quran.com (QuranicAudio files). Each surah's file URL is read from the
// Quran.com API (the URL pattern differs per reciter), never guessed.
//
// Verified 2026-11-20 against GET /api/v4/resources/recitations and /chapter_recitations/{id}/1.
// Recitation id 11 is listed as "Mohamed al-Tablawi" but its audio files belong to another
// reciter (abdul_muhsin_alqasim), so it is deliberately left out.

export interface Reciter {
  id: number
  name: string
  ar: string
  style: string
}

export const RECITERS: Reciter[] = [
  { id: 7, name: 'Mishari Rashid al-Afasy', ar: 'مشاري راشد العفاسي', style: 'Murattal' },
  { id: 2, name: 'AbdulBaset AbdulSamad', ar: 'عبد الباسط عبد الصمد', style: 'Murattal' },
  { id: 1, name: 'AbdulBaset AbdulSamad', ar: 'عبد الباسط عبد الصمد', style: 'Mujawwad' },
  { id: 3, name: 'Abdur-Rahman as-Sudais', ar: 'عبد الرحمن السديس', style: 'Murattal' },
  { id: 10, name: "Sa'ud ash-Shuraym", ar: 'سعود الشريم', style: 'Murattal' },
  { id: 4, name: 'Abu Bakr al-Shatri', ar: 'أبو بكر الشاطري', style: 'Murattal' },
  { id: 9, name: 'Mohamed Siddiq al-Minshawi', ar: 'محمد صديق المنشاوي', style: 'Murattal' },
  { id: 8, name: 'Mohamed Siddiq al-Minshawi', ar: 'محمد صديق المنشاوي', style: 'Mujawwad' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary', ar: 'محمود خليل الحصري', style: 'Murattal' },
  { id: 12, name: 'Mahmoud Khalil Al-Husary', ar: 'محمود خليل الحصري', style: "Mu'allim (barasho)" },
  { id: 5, name: 'Hani ar-Rifai', ar: 'هاني الرفاعي', style: 'Murattal' },
]

export const AUDIO_CACHE = 'diin-audio'
const URL_CACHE = 'diin-audio-urls'

/** Audio file URL for (reciter, surah). The API answer is cached so it also works offline. */
export async function audioUrl(reciter: number, surah: number): Promise<string> {
  const api = `https://api.quran.com/api/v4/chapter_recitations/${reciter}/${surah}`
  let res: Response | undefined
  try {
    res = await fetch(api)
    if (res.ok) {
      const copy = res.clone()
      caches.open(URL_CACHE).then((c) => c.put(api, copy)).catch(() => {})
    }
  } catch {
    res = await caches.match(api)
  }
  if (!res || !res.ok) throw new Error('audio-url')
  const json = (await res.json()) as { audio_file?: { audio_url?: string } }
  const url = json.audio_file?.audio_url
  if (!url || !/^https:\/\/download\.quranicaudio\.com\//.test(url)) throw new Error('audio-url')
  return url
}

export async function isDownloaded(url: string): Promise<boolean> {
  try {
    return !!(await (await caches.open(AUDIO_CACHE)).match(url))
  } catch {
    return false
  }
}

/** Save a surah recitation for offline listening (explicit user action only). */
export async function download(url: string): Promise<void> {
  const cache = await caches.open(AUDIO_CACHE)
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error('download')
  await cache.put(url, res)
}

export async function removeDownload(url: string): Promise<void> {
  await (await caches.open(AUDIO_CACHE)).delete(url)
}

export const formatClock = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
