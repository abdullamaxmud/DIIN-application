import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { BottomNav } from './BottomNav'

/** Phone-width column on every screen size, with the floating nav on top. */
export function Layout() {
  const { pathname } = useLocation()
  // block body on purpose: an effect must return a cleanup function or nothing
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-ivory pb-28 shadow-[0_0_80px_rgba(0,0,0,0.35)]">
      <Outlet />
      <BottomNav />
    </div>
  )
}
