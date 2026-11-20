import { useEffect, useState } from 'react'
import { loadHisnChapter, loadHisnIndex, loadQuran, loadSurah, type HisnChapter, type HisnIndex, type QuranData, type SurahText } from './data'

function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    loader().then((d) => alive && setData(d), () => alive && setError(true))
    return () => { alive = false }
  }, [loader])
  return { data, error }
}

export const useQuran = () => useLoad<QuranData>(loadQuran)
export const useHisnIndex = () => useLoad<HisnIndex>(loadHisnIndex)

/** Text of one surah (null while loading). */
export function useSurah(n: number) {
  const [data, setData] = useState<SurahText | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    loadSurah(n).then((d) => alive && setData(d), () => alive && setError(true))
    return () => { alive = false }
  }, [n])
  return { data, error }
}

/** One Hisn al-Muslim chapter (null while loading). */
export function useHisnChapter(id: number) {
  const [data, setData] = useState<HisnChapter | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let alive = true
    setData(null)
    setError(false)
    if (!id) { setError(true); return }
    loadHisnChapter(id).then((d) => alive && setData(d), () => alive && setError(true))
    return () => { alive = false }
  }, [id])
  return { data, error }
}
