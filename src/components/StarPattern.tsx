import { useId } from 'react'

/** Subtle eight-point-star (khatam) tile used behind dark headers. Purely decorative. */
export function StarPattern({ opacity = 0.09, color = '#E9D49E', size = 56 }: { opacity?: number; color?: string; size?: number }) {
  const id = useId().replace(/:/g, '')
  const h = size / 2
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <path d={`M${h} 2 L${h + 7} ${h - 7} L${size - 2} ${h} L${h + 7} ${h + 7} L${h} ${size - 2} L${h - 7} ${h + 7} L2 ${h} L${h - 7} ${h - 7} Z`} fill="none" stroke={color} strokeWidth="0.9" />
          <rect x={h - 11} y={h - 11} width="22" height="22" transform={`rotate(45 ${h} ${h})`} fill="none" stroke={color} strokeWidth="0.9" />
          <circle cx={h} cy={h} r="3" fill="none" stroke={color} strokeWidth="0.9" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/** Thin gold rule with a small star in the middle. */
export function OrnamentDivider() {
  return (
    <div className="flex items-center gap-2.5" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D9C9A0]" />
      <svg width="12" height="12" viewBox="0 0 48 48"><path d="M24 2 L30 18 L46 24 L30 30 L24 46 L18 30 L2 24 L18 18 Z" fill="#C9A34E" /></svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D9C9A0]" />
    </div>
  )
}
