import type { ReactNode } from 'react'
import { StarPattern } from './StarPattern'

/** Dark "night" header shared by the inner screens. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="night relative overflow-hidden rounded-b-[32px] px-4 pt-[max(18px,env(safe-area-inset-top))] pb-5">
      <StarPattern opacity={0.1} />
      <div className="relative">
        <h1 className="m-0 font-serif text-[26px] font-semibold">{title}</h1>
        {subtitle && <p className="m-0 mt-0.5 text-xs text-mist">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}
