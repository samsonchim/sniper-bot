import { Reveal } from './Reveal'
import { ScrollHint } from './ScrollHint'

const FEATURES = [
  {
    title: 'Mempool-grade speed',
    body: 'Pending transactions are parsed the moment they hit the public mempool. Median execution in 38ms — ahead of the pack.',
    icon: '⚡',
    tint: 'var(--color-snipe)',
    span: 'md:col-span-2',
  },
  {
    title: 'Anti-rug shield',
    body: 'Honeypot, tax, and liquidity-lock checks run pre-trade. Suspect contracts are skipped automatically.',
    icon: '🛡️',
    tint: 'var(--color-violet)',
    span: '',
  },
  {
    title: 'Multi-chain',
    body: 'ETH, Base, BSC, Solana, Arbitrum & more from one cockpit.',
    icon: '⛓️',
    tint: 'var(--color-cyan)',
    span: '',
  },
  {
    title: 'Auto TP / SL',
    body: 'Set take-profit ladders and trailing stop-losses that fire on-chain without you watching the chart.',
    icon: '🎯',
    tint: 'var(--color-snipe)',
    span: 'md:col-span-2',
  },
]

const PRODUCTS = [
  {
    title: 'Bot trading',
    body: 'Automated on-chain execution that watches the mempool and fires the instant liquidity lands — with rug protection baked in.',
    icon: '🤖',
    tint: 'var(--color-snipe)',
  },
  {
    title: 'Store tokens',
    body: 'Hold your tokens & NFTs in one place. Track balances across chains and keep your portfolio in a single cockpit.',
    icon: '🗄️',
    tint: 'var(--color-violet)',
  },
  {
    title: 'Deposit',
    body: 'Fund your session balance with BTC, SOL, XRP and more. Fast confirmations, clear on-chain receipts.',
    icon: '⬇️',
    tint: 'var(--color-cyan)',
  },
  {
    title: 'Withdraw',
    body: 'Move funds back out on your terms. Request a withdrawal and settle to your wallet — you stay in control.',
    icon: '⬆️',
    tint: 'var(--color-snipe)',
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
    body: 'Arm the bot and walk away. Web3Chainbot fires the instant liquidity lands and manages the exit.',
  },
]

const CHAINS = [
  'Ethereum',
  'Base',
  'BNB Chain',
  'Solana',
  'Arbitrum',
  'Polygon',
  'Optimism',
  'Avalanche',
  'Blast',
  'Sui',
]

/** Mock live mempool feed shown in the hero — sells the product at a glance. */
const FEED = [
  { k: 'pair', a: 'New pair', b: 'PEPE / WETH', tone: 'muted' },
  { k: 'scan', a: 'Safety', b: 'honeypot ✓  tax 0% ✓  lock ✓', tone: 'ok' },
  { k: 'snipe', a: 'SNIPED', b: '0.42 ETH → 1.24M PEPE', tone: 'hit' },
  { k: 'fill', a: 'Filled in', b: '38 ms · block +0', tone: 'muted' },
  { k: 'tp', a: 'TP1 hit', b: '+82% · sold 40%', tone: 'ok' },
]

function HeroTerminal() {
  return (
    <div className="ring-gradient relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
      {/* moving scanline */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div className="animate-scanline h-8 w-full bg-[linear-gradient(to_bottom,transparent,rgba(52,245,163,0.10),transparent)]" />
      </div>

      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-faint)]">
          web3chainbot://live
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-snipe)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-snipe)]" />
          live
        </span>
      </div>

      {/* feed */}
      <div className="space-y-1.5 p-4 font-[family-name:var(--font-mono)] text-xs">
        {FEED.map((row) => (
          <div
            key={row.k}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
              row.tone === 'hit'
                ? 'bg-[var(--color-snipe)]/10 ring-1 ring-[var(--color-snipe)]/30'
                : 'bg-white/[0.02]'
            }`}
          >
            <span
              className={
                row.tone === 'hit'
                  ? 'font-semibold text-[var(--color-snipe)]'
                  : row.tone === 'ok'
                    ? 'text-[var(--color-cyan)]'
                    : 'text-[var(--color-muted)]'
              }
            >
              {row.a}
            </span>
            <span className="text-right text-[var(--color-fg)]/90">{row.b}</span>
          </div>
        ))}
      </div>

      {/* footer stat strip */}
      <div className="grid grid-cols-3 border-t border-[var(--color-line)] text-center">
        {[
          ['P&L', '+142%'],
          ['Win rate', '73%'],
          ['Latency', '38ms'],
        ].map(([l, v]) => (
          <div key={l} className="px-2 py-3">
            <div className="font-[family-name:var(--font-display)] text-sm font-bold text-white">
              {v}
            </div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-faint)]">
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sections({ onConnect }: { onConnect: () => void }) {
  return (
    <main data-scroll-content className="relative w-screen text-[var(--color-fg)]">
      {/* ============================== HERO ============================== */}
      <section
        id="top"
        className="relative flex min-h-screen w-screen items-center px-5 pt-28 pb-20 sm:px-8"
      >
        <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/[0.03] px-4 py-1.5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.25em] text-[var(--color-snipe)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-snipe)]" />
                On-chain sniper · v3
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="text-fluid-hero mt-6 font-[family-name:var(--font-display)] font-bold">
                Snipe first.
                <br />
                <span className="text-gradient">Every block.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-xl text-base text-[var(--color-muted)] sm:text-lg lg:mx-0">
                Mempool-grade execution, anti-rug filters, and auto take-profit —
                across a dozen chains from one cockpit. Buy, store, and swap tokens
                &amp; NFTs at the speed of the first block.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <button
                  onClick={onConnect}
                  className="w-full rounded-xl bg-[var(--color-snipe)] px-7 py-3.5 font-semibold text-black transition hover:brightness-110 glow-snipe sm:w-auto"
                >
                  Launch App
                </button>
                <button
                  onClick={onConnect}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-white/[0.03] px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:border-[var(--color-snipe)]/50 hover:bg-white/[0.06] sm:w-auto"
                >
                  Connect Wallet
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="mt-8 flex items-center justify-center gap-6 font-[family-name:var(--font-mono)] text-xs text-[var(--color-faint)] lg:justify-start">
                <span>◇ Non-custodial</span>
                <span>◇ 38ms median</span>
                <span>◇ 12 chains</span>
              </div>
            </Reveal>
          </div>

          {/* Right: live terminal visual */}
          <Reveal delay={0.2} className="flex justify-center lg:justify-end">
            <HeroTerminal />
          </Reveal>
        </div>

        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <ScrollHint />
        </div>
      </section>

      {/* ============================ CHAIN MARQUEE ====================== */}
      <section className="w-screen overflow-hidden border-y border-[var(--color-line)] bg-white/[0.015] py-6">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap will-change-transform">
          {[...CHAINS, ...CHAINS].map((c, i) => (
            <span
              key={i}
              className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-muted)]/70"
            >
              {c}
              <span className="ml-12 text-[var(--color-snipe)]/40">✦</span>
            </span>
          ))}
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
              <article
                className="glass group relative h-full overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1"
                style={{ ['--tint' as string]: f.tint }}
              >
                {/* accent glow that reveals on hover */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle, ${f.tint}, transparent 70%)` }}
                />
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl text-2xl"
                  style={{ background: `color-mix(in oklab, ${f.tint} 14%, transparent)` }}
                >
                  {f.icon}
                </span>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold">
                  {f.title}
                </h3>
                <p className="mt-2 text-[var(--color-muted)]">{f.body}</p>
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                  style={{ background: f.tint }}
                />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ PRODUCTS =========================== */}
      <section
        id="products"
        className="relative mx-auto flex min-h-screen w-screen max-w-7xl flex-col justify-center px-5 py-24 sm:px-8"
      >
        <Reveal>
          <p className="font-[family-name:var(--font-mono)] text-sm uppercase tracking-[0.25em] text-[var(--color-snipe)]">
            // everything in one place
          </p>
          <h2 className="text-fluid-h2 mt-3 max-w-2xl font-[family-name:var(--font-display)] font-bold">
            Trade, store, and move your assets.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <article
                className="glass group relative h-full overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1"
              >
                <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle, ${p.tint}, transparent 70%)` }}
                />
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl text-2xl"
                  style={{ background: `color-mix(in oklab, ${p.tint} 14%, transparent)` }}
                >
                  {p.icon}
                </span>
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{p.body}</p>
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
            <span className="text-gradient">milliseconds</span>.
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="group relative flex h-full flex-col items-center justify-center gap-2 bg-[var(--color-ink)] px-4 py-12 transition-colors hover:bg-[#0d1017]">
                <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-[var(--color-snipe)] transition-transform duration-300 group-hover:scale-x-100" />
                <span className="text-fluid-stat font-[family-name:var(--font-display)] font-bold text-white">
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
              <div className="group relative h-full overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/[0.02] p-7 transition hover:border-[var(--color-snipe)]/40">
                <span className="font-[family-name:var(--font-mono)] text-5xl font-bold text-[var(--color-snipe)]/20 transition group-hover:text-[var(--color-snipe)]/40">
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
          <div className="ring-gradient relative mt-20 flex flex-col items-center gap-6 overflow-hidden rounded-3xl px-6 py-16 text-center">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,245,163,0.18),transparent_70%)] blur-2xl" />
            <h2 className="text-fluid-h2 relative max-w-2xl font-[family-name:var(--font-display)] font-bold">
              Stop arriving second.
            </h2>
            <p className="relative max-w-md text-[var(--color-muted)]">
              Connect your wallet and arm your first snipe in under two minutes.
            </p>
            <button
              onClick={onConnect}
              className="relative rounded-xl bg-[var(--color-snipe)] px-8 py-3.5 font-semibold text-black transition hover:brightness-110 glow-snipe"
            >
              Connect Wallet
            </button>
          </div>
        </Reveal>

        {/* Footer */}
        <footer className="mt-24 border-t border-[var(--color-line)] pt-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold">
              Web3<span className="text-[var(--color-snipe)]">Chainbot</span>
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-muted)]">
              <a href="#" className="transition hover:text-white">Docs</a>
              <a href="#" className="transition hover:text-white">Twitter</a>
              <a href="#" className="transition hover:text-white">Telegram</a>
              <a href="#" className="transition hover:text-white">Terms</a>
            </div>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-faint)]">
              © {new Date().getFullYear()} Web3Chainbot
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
