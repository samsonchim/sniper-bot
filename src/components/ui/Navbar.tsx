import { useEffect, useState } from 'react'

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Performance', href: '#performance' },
  { label: 'How it works', href: '#how' },
  { label: 'Docs', href: '#' },
]

export function Navbar({ onConnect }: { onConnect: () => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = document.querySelector('[data-scroll-root]') ?? window
    const onScroll = () => {
      const y = el === window ? window.scrollY : (el as HTMLElement).scrollTop
      setScrolled(y > 24)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-[var(--color-line)]' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="group flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 place-items-center">
            <span className="absolute inset-0 rounded-md border border-[var(--color-snipe)]/60" />
            <span className="absolute h-[1px] w-5 bg-[var(--color-snipe)]" />
            <span className="absolute h-5 w-[1px] bg-[var(--color-snipe)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-snipe)] glow-snipe" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
            Shadow<span className="text-[var(--color-snipe)]">Snipe</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-[var(--color-muted)] transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <button
          onClick={onConnect}
          className="group relative overflow-hidden rounded-lg bg-[var(--color-snipe)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 sm:px-5"
        >
          <span className="relative z-10">Connect Wallet</span>
        </button>
      </nav>
    </header>
  )
}
