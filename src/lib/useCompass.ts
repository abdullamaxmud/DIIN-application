import { useCallback, useEffect, useRef, useState } from 'react'
import { magneticHeading, smoothHeading, type OrientationReading } from './qibla'

/**
 * starting: listening for the first reading · needs-permission: iPhone must allow motion access from a tap
 * running: live heading · denied: motion access refused · unavailable: this device has no usable compass
 */
export type CompassStatus = 'starting' | 'needs-permission' | 'running' | 'denied' | 'unavailable'

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

const screenAngle = () => screen.orientation?.angle ?? 0

/** Live magnetic heading. The value is continuous (it can pass 360), so a dial never spins the long way round. */
export function useCompass() {
  const [status, setStatus] = useState<CompassStatus>('starting')
  const [heading, setHeading] = useState<number | null>(null)
  const [lowAccuracy, setLowAccuracy] = useState(false)
  const stop = useRef<(() => void) | null>(null)

  /** `mayAsk`: if nothing arrives, the device needs a tap to allow motion access (iPhone). */
  const start = useCallback((mayAsk: boolean) => {
    stop.current?.()
    setStatus('starting')
    let target: number | null = null
    let current: number | null = null
    let published: number | null = null
    let frame = 0
    let gotAbsolute = false

    const onReading = (e: DeviceOrientationEvent) => {
      const absoluteEvent = e.type === 'deviceorientationabsolute'
      if (absoluteEvent) gotAbsolute = true
      else if (gotAbsolute) return // Android sends both: keep the one with a real north
      const h = magneticHeading(e as unknown as OrientationReading, absoluteEvent || e.absolute === true, screenAngle())
      if (h === null) return
      target = h
      const accuracy = (e as unknown as OrientationReading).webkitCompassAccuracy
      setLowAccuracy(typeof accuracy === 'number' && accuracy > 25)
      setStatus('running')
    }

    const tick = () => {
      if (target !== null) {
        current = current === null ? target : smoothHeading(current, target)
        if (published === null || Math.abs(current - published) >= 0.4) {
          published = current
          setHeading(current)
        }
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('deviceorientationabsolute', onReading as EventListener)
    window.addEventListener('deviceorientation', onReading)
    frame = requestAnimationFrame(tick)
    const noData = window.setTimeout(() => setStatus((s) => (s === 'starting' ? (mayAsk ? 'needs-permission' : 'unavailable') : s)), mayAsk ? 900 : 3000)

    stop.current = () => {
      window.removeEventListener('deviceorientationabsolute', onReading as EventListener)
      window.removeEventListener('deviceorientation', onReading)
      cancelAnimationFrame(frame)
      window.clearTimeout(noData)
      stop.current = null
    }
  }, [])

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') setStatus('unavailable')
    else start(typeof (DeviceOrientationEvent as OrientationCtor).requestPermission === 'function')
    return () => stop.current?.()
  }, [start])

  /** iPhone: must be called directly from a tap. */
  const enable = useCallback(async () => {
    try {
      const answer = await (DeviceOrientationEvent as OrientationCtor).requestPermission?.()
      if (answer === 'granted') start(false)
      else setStatus('denied')
    } catch {
      setStatus('denied')
    }
  }, [start])

  return { status, heading, lowAccuracy, enable }
}
