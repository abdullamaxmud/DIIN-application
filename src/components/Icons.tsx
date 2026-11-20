import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
})

export const HomeIcon = ({ size = 23, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
)
export const BookIcon = ({ size = 23, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M2 5h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" /><path d="M22 5h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></svg>
)
export const BeadsIcon = ({ size = 23, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="4.5" r="2" /><circle cx="6" cy="9" r="2" /><circle cx="18" cy="9" r="2" /><circle cx="8" cy="15.5" r="2" /><circle cx="16" cy="15.5" r="2" /><path d="M12 18v4" /></svg>
)
export const MosqueIcon = ({ size = 23, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M12 3c-3 2-5 4-5 7h10c0-3-2-5-5-7z" /><path d="M5 21V10h14v11" /><path d="M10 21v-4a2 2 0 0 1 4 0v4" /><path d="M3 21h18" /></svg>
)
export const HeadphonesIcon = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="3" y="14" width="5" height="7" rx="2" /><rect x="16" y="14" width="5" height="7" rx="2" /></svg>
)
export const CalendarCheckIcon = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></svg>
)
export const BellIcon = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
)
export const PinIcon = ({ size = 13, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
)
export const MoonIcon = ({ size = 13, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
)
export const DownloadIcon = ({ size = 15, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.4} {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
)
export const ChevronRightIcon = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.6} {...p}><path d="m9 6 6 6-6 6" /></svg>
)
export const ChevronLeftIcon = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size)} strokeWidth={2.4} {...p}><path d="m15 6-6 6 6 6" /></svg>
)

/** The DIIN mark: an eight-point star (Rub el Hizb, two overlapping squares) with a gold centre. */
export const DiinMark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <g fill="none" stroke="#C9A34E" strokeWidth="2">
      <rect x="11" y="11" width="26" height="26" />
      <rect x="11" y="11" width="26" height="26" transform="rotate(45 24 24)" />
    </g>
    <circle cx="24" cy="24" r="4.5" fill="#C9A34E" />
  </svg>
)
