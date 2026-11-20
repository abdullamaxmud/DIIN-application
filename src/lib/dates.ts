import { tList } from '../i18n'

/** "Khamiis, 19 Nofembar 2026" */
export function formatGregorian(date: Date): string {
  const days = tList('date.days')
  const months = tList('date.months')
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

/** Hijri date using the Umm al-Qura calendar built into the browser (Intl), with Somali month names. */
export function formatHijri(date: Date, timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone,
    }).formatToParts(date)
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '', 10)
    const month = tList('date.hijriMonths')[get('month') - 1]
    if (!month) return ''
    return `${get('day')} ${month} ${get('year')}`
  } catch {
    return ''
  }
}
