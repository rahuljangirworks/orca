import type React from 'react'

export function VeerLogo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg 
      className={className} 
      viewBox="0 0 256 256" 
      fill="none" 
      aria-hidden
    >
      <rect width="256" height="256" rx="64" fill="currentColor"/>
      <path d="M128 200L64 80h48l24 64 24-64h48L128 200z" fill="var(--color-bg, #000)"/>
    </svg>
  )
}
