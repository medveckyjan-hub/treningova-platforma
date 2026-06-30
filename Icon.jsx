// Sada čistých čiarových ikoniek (štýl ako horné dlaždice v klubovej appke).

function Svg({ size = 24, color = 'currentColor', sw = 2, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

// Pingpongová raketa (vyplnená – branding)
export function Paddle({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="9" r="6.3" fill="#4cc9b0" />
      <line x1="12.2" y1="13.6" x2="16.2" y2="20.3" stroke="#2f7d8f" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="18.4" cy="6.1" r="1.85" fill="#cdeee6" />
    </svg>
  )
}

export const Clipboard = (p) => (
  <Svg {...p}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4" />
    <path d="M8.8 12.6l2 2 3.6-3.9" />
  </Svg>
)
export const Calendar = (p) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 9.5h16" />
    <path d="M8 3v3M16 3v3" />
  </Svg>
)
export const Trophy = (p) => (
  <Svg {...p}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
    <path d="M7 5H4.3v1.5a3 3 0 0 0 3 3" />
    <path d="M17 5h2.7v1.5a3 3 0 0 1-3 3" />
    <path d="M12 12.5V16" />
    <path d="M9 20h6" />
    <path d="M10 20l.6-4h2.8l.6 4" />
  </Svg>
)
export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </Svg>
)
export const Target = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)
export const Settings = (p) => (
  <Svg {...p}>
    <path d="M4 8h16M4 16h16" />
    <circle cx="9" cy="8" r="2.3" />
    <circle cx="15" cy="16" r="2.3" />
  </Svg>
)
