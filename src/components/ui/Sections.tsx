import { Reveal } from './Reveal'
import { ScrollHint } from './ScrollHint'

const FEATURES = [
  {
    title: 'Mempool-grade speed',
    body: 'Pending transactions are parsed the moment they hit the public mempool. Median execution in 38ms — ahead of the pack.',
    icon: '⚡',
    span: 'md:col-span-2',
  },
  {
    title: 'Anti-rug shield',
    body: 'Honeypot, tax, and liquidity-lock checks run pre-trade. Suspect contracts are skipped automatically.',
    icon: '🛡️',
    span: '',
  },
  {
    title: 'Multi-chain',
    body: 'ETH, Base, BSC, Solana, Arbitrum & more from one cockpit.',
    icon: '⛓️',
    span: '',
  },
  {
    title: 'Auto TP / SL',
    body: 'Set take-profit ladders and trailing stop-losses that fire on-chain without you watching the chart.',
    icon: '🎯',
    span: 'md:col-span-2',
  },
]

const STATS = [
  { value: '38ms', label: 'Median execution' },
  { value: '12', label: 'Chains supported' },
  { value: '$4.2B', label: 'Volume sniped' },
  { value: '71k', label: 'Active snipers' },
]

const STEPS = [
  {
    n: '01',
    title: 'Connect',
    body: 'Link your wallet and fund a session balance. Non-custodial — your keys stay yours.',
  },
  {
    n: '02',
    title: 'Configure',
    body: 'Pick a chain, set buy size, slippage, and your safety filters. Save presets for instant deploys.',
  },
  {
    n: '03',
    title: 'Snipe',
    body: 'Arm the bot and walk away. ShadowSnipe fires the instant liquidity lands and manages the exit.',
  },
]

export function Sections({ onConnect }: { onConnect: () => void }) {
  return (
    <main data-scroll-content className="relative w-screen text-[var(--color-fg)]">
      {/* ============================== HERO ============================== */}
      <section
        id="top"
        className="relative flex min-h-screen w-screen flex-col items-center justify-center px-5 text-center"
      >
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/[0.03] px-4 py-1.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.25em] text-[var(--color-snipe)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-snipe)]" />
            On-chain sniper · v3
          </span>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="text-fluid-hero mt-6 max-w-5xl font-[family-name:var(--font-display)] font-bold">
            Snipe first.
            <br />
            <span className="bg-gradient-to-r from-[var(--color-snipe)] via-[var(--color-cyan)] to-[var(--color-violet)] bg-clip-text text-transparent">
              Every block.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-base text-[var(--color-muted)] sm:text-lg">
            ShadowSnipe watches the mempool and fires the instant liquidity lands —
            faster than the bots you're racing, with rug protection baked in.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={onConnect}
              className="rounded-xl bg-[var(--color-snipe)] px-7 py-3.5 font-semibold text-black transition hover:brightness-110 glow-snipe"
            >
              Launch App
            </button>
            <button
              onClick={onConnect}
              className="rounded-xl border border-[var(--color-line)] bg-white/[0.03] px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:border-[var(--color-snipe)]/50 hover:bg-white/[0.06]"
            >
              Connect Wallet
            </button>
          </div>
        </Reveal>

        <div className="absolute bottom-8">
          <ScrollHint />
        </div>
      </section>

      {/* ============================ FEATURES =========================== */}
      <section
        id="features"
        className="relative mx-auto flex min-h-screen w-screen max-w-7xl flex-col justify-center px-5 py-24 sm:px-8"
      >
        <Reveal>
          <p className="font-[family-name:var(--font-mono)] text-sm uppercase tracking-[0.25em] text-[var(--color-snipe)]">
            // capabilities
          </p>
          <h2 className="text-fluid-h2 mt-3 max-w-2xl font-[family-name:var(--font-display)] font-bold">
            Built to win the first block.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} className={f.span}>
              <article className="glass group h-full rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-snipe)]/40">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-snipe)]/10 text-2xl">
                  {f.icon}
                </span>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold">
                  {f.title}
                </h3>
                <p className="mt-2 text-[var(--color-muted)]">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* =========================== PERFORMANCE ========================= */}
      <section
        id="performance"
        className="relative mx-auto flex min-h-screen w-screen max-w-7xl flex-col justify-center px-5 py-24 text-center sm:px-8"
      >
        <Reveal>
          <h2 className="text-fluid-h2 mx-auto max-w-3xl font-[family-name:var(--font-display)] font-bold">
            Numbers that close the gap on{' '}
            <span className="text-[var(--color-snipe)]">milliseconds</span>.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-[var(--color-ink)] px-4 py-12">
                <span className="text-fluid-stat bg-gradient-to-b from-white to-[var(--color-snipe)] bg-clip-text font-[family-name:var(--font-display)] font-bold text-transparent">
                  {s.value}
                </span>
                <span className="text-sm uppercase tracking-wide text-[var(--color-muted)]">
                  {s.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ HOW IT WORKS ======================= */}
      <section
        id="how"
        className="relative mx-auto flex min-h-screen w-screen max-w-6xl flex-col justify-center px-5 py-24 sm:px-8"
      >
        <Reveal>
          <p className="font-[family-name:var(--font-mono)] text-sm uppercase tracking-[0.25em] text-[var(--color-snipe)]">
            // workflow
          </p>
          <h2 className="text-fluid-h2 mt-3 font-[family-name:var(--font-display)] font-bold">
            Three steps to the trigger.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="relative h-full rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-7">
                <span className="font-[family-name:var(--font-mono)] text-5xl font-bold text-[var(--color-snipe)]/20">
                  {s.n}
                </span>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">
                  {s.title}
                </h3>
                <p className="mt-2 text-[var(--color-muted)]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Final CTA */}
        <Reveal delay={0.1}>
          <div className="glass mt-20 flex flex-col items-center gap-6 rounded-3xl px-6 py-14 text-center">
            <h2 className="text-fluid-h2 max-w-2xl font-[family-name:var(--font-display)] font-bold">
              Stop arriving second.
            </h2>
            <p className="max-w-md text-[var(--color-muted)]">
              Connect your wallet and arm your first snipe in under two minutes.
            </p>
            <button
              onClick={onConnect}
              className="rounded-xl bg-[var(--color-snipe)] px-8 py-3.5 font-semibold text-black transition hover:brightness-110 glow-snipe"
            >
              Connect Wallet
            </button>
          </div>
        </Reveal>

        {/* Footer */}
        <footer className="mt-24 border-t border-[var(--color-line)] pt-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold">
              Shadow<span className="text-[var(--color-snipe)]">Snipe</span>
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-muted)]">
              <a href="#" className="transition hover:text-white">Docs</a>
              <a href="#" className="transition hover:text-white">Twitter</a>
              <a href="#" className="transition hover:text-white">Telegram</a>
              <a href="#" className="transition hover:text-white">Terms</a>
            </div>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-faint)]">
              © {new Date().getFullYear()} ShadowSnipe
            </span>
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-faint)]">
            Demo rebuild for design purposes. Trading on-chain carries risk; this
            interface requests no payments and accesses no wallet.
          </p>
        </footer>
      </section>
    </main>
  )
}
