/**
 * Tiny global scroll tracker. `offset` is the page scroll progress in [0, 1].
 * Read it inside useFrame (it mutates in place — no React re-renders).
 */
export const scrollState = { offset: 0 }

function update() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  scrollState.offset = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
}

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  update()
}
