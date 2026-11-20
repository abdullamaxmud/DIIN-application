import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { RECITERS, audioUrl, download, isDownloaded, removeDownload } from './audio'
import { useStored } from './store'
import { loadQuran } from './data'

// One audio element for the whole app, so recitation keeps playing while the user moves between screens.

type DlState = 'none' | 'saving' | 'saved' | 'error'

interface PlayerCtx {
  reciter: number
  surah: number
  playing: boolean
  loading: boolean
  error: boolean
  repeat: boolean
  time: number
  duration: number
  dl: DlState
  activate: () => void
  setReciter: (id: number) => void
  playSurah: (n: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (sec: number) => void
  setRepeat: (on: boolean) => void
  saveOffline: () => void
  removeOffline: () => void
}

const Ctx = createContext<PlayerCtx | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [reciter, setReciterStored] = useStored<number>('audio.reciter', 7)
  const [surah, setSurah] = useStored<number>('audio.surah', 1)
  const [repeat, setRepeat] = useStored<boolean>('audio.repeat', false)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const [dl, setDl] = useState<DlState>('none')
  const wantPlay = useRef(false)
  // nothing is fetched until the listening screen is opened (keeps app start-up light)
  const [active, setActive] = useState(false)

  if (!audio.current && typeof Audio !== 'undefined') {
    audio.current = new Audio()
    audio.current.preload = 'metadata'
  }

  // resolve the file URL whenever reciter/surah change
  useEffect(() => {
    if (!active) return
    let alive = true
    setError(false)
    setUrl(null)
    setTime(0)
    setDuration(0)
    audioUrl(reciter, surah).then(
      (u) => { if (alive) setUrl(u) },
      () => { if (alive) { setError(true); setLoading(false) } },
    )
    return () => { alive = false }
  }, [reciter, surah, active])

  useEffect(() => {
    const el = audio.current
    if (!el || !url) return
    el.src = url
    isDownloaded(url).then((ok) => setDl(ok ? 'saved' : 'none'))
    if (wantPlay.current) {
      setLoading(true)
      el.play().catch(() => { setPlaying(false); setLoading(false) })
    }
  }, [url])

  const next = useCallback(() => { wantPlay.current = playing; setSurah((s) => Math.min(114, s + 1)) }, [playing, setSurah])
  const prev = useCallback(() => { wantPlay.current = playing; setSurah((s) => Math.max(1, s - 1)) }, [playing, setSurah])

  useEffect(() => {
    const el = audio.current
    if (!el) return
    const on = {
      play: () => setPlaying(true),
      playing: () => { setPlaying(true); setLoading(false) },
      pause: () => setPlaying(false),
      waiting: () => setLoading(true),
      timeupdate: () => setTime(el.currentTime),
      durationchange: () => setDuration(el.duration),
      error: () => { setError(true); setLoading(false); setPlaying(false) },
      ended: () => {
        if (repeat) { el.currentTime = 0; void el.play() }
        else if (surah < 114) { wantPlay.current = true; setSurah(surah + 1) }
        else setPlaying(false)
      },
    }
    for (const [k, f] of Object.entries(on)) el.addEventListener(k, f)
    return () => { for (const [k, f] of Object.entries(on)) el.removeEventListener(k, f) }
  }, [repeat, surah, setSurah])

  // lock-screen / headset controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const r = RECITERS.find((x) => x.id === reciter)
    loadQuran().then((q) => {
      const s = q.surahs[surah - 1]
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${s.n}. ${s.name} — ${s.ar}`,
        artist: r ? `${r.name} (${r.style})` : '',
        album: 'DIIN · Quraanka',
        artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
      })
    }).catch(() => {})
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', prev)
  }, [reciter, surah, next, prev])

  const toggle = useCallback(() => {
    const el = audio.current
    if (!el) return
    if (el.paused) {
      wantPlay.current = true
      if (!el.src && url) el.src = url
      setLoading(true)
      el.play().catch(() => { setLoading(false); setPlaying(false) })
    } else {
      wantPlay.current = false
      el.pause()
    }
  }, [url])

  const value: PlayerCtx = {
    reciter, surah, playing, loading, error, repeat, time, duration, dl,
    activate: () => setActive(true),
    setReciter: (id) => { wantPlay.current = playing; setReciterStored(id) },
    playSurah: (n) => { wantPlay.current = true; if (n === surah && url) { toggle() } else setSurah(n) },
    toggle, next, prev,
    seek: (sec) => { if (audio.current) audio.current.currentTime = sec },
    setRepeat,
    saveOffline: () => {
      if (!url) return
      setDl('saving')
      download(url).then(() => setDl('saved'), () => setDl('error'))
    },
    removeOffline: () => { if (url) removeDownload(url).then(() => setDl('none')) },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlayer() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePlayer outside PlayerProvider')
  return c
}
