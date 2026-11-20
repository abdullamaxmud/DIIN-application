import type { ReactNode } from 'react'

/** Gold progress ring. Draws nothing on the arc when the value is 0 (no stray dot). */
export function Ring({ value, max, size = 74, stroke = 7, track = '#EFE6D2', fill = 'none', label, children }: {
  value: number
  max: number
  size?: number
  stroke?: number
  track?: string
  fill?: string
  label: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2 - 1
  const circ = 2 * Math.PI * r
  const frac = Math.min(1, Math.max(0, value / max))
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={fill} stroke={track} strokeWidth={stroke} />
        {value > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#C9A34E"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(circ * frac).toFixed(1)} ${circ.toFixed(1)}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">{children}</span>
    </div>
  )
}
