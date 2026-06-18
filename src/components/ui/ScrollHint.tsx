export function ScrollHint() {
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2 text-[var(--color-faint)]">
      <span className="font-[family-name:var(--font-mono)] text-[0.7rem] uppercase tracking-[0.3em]">
        Scroll
      </span>
      <span
        className="block h-9 w-[1px] bg-gradient-to-b from-[var(--color-snipe)] to-transparent"
        style={{ animation: 'float-hint 1.8s ease-in-out infinite' }}
      />
    </div>
  )
}
