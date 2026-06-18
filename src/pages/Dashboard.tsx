import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearConnection,
  loadConnection,
  payGasFee,
  readableWalletError,
  shortAddress,
  type Connection,
} from '../lib/wallet'
import { getDb, recordPayment } from '../lib/db'

const WALLET_NAME: Record<Connection['walletId'], string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  phantom: 'Phantom',
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

type PayStage = 'idle' | 'paying' | 'paid' | 'error'

/**
 * The signed-in area. Reads the persisted connection; if there isn't one we
 * bounce back to the landing page so the connect flow is the only way in.
 */
export function Dashboard() {
  const navigate = useNavigate()
  const [conn, setConn] = useState<Connection | null>(null)

  // Prefill with a random meme token each load.
  const initialName = useMemo(
    () => MEME_TOKENS[Math.floor(Math.random() * MEME_TOKENS.length)].name,
    [],
  )
  const [tokenName, setTokenName] = useState(initialName)
  const token =
    MEME_TOKENS.find((t) => t.name === tokenName)?.address ?? MEME_TOKENS[0].address
  const [amount, setAmount] = useState('0.5')

  const [payStage, setPayStage] = useState<PayStage>('idle')
  const [payMsg, setPayMsg] = useState('')

  useEffect(() => {
    const c = loadConnection()
    if (!c) {
      navigate('/', { replace: true })
      return
    }
    setConn(c)
  }, [navigate])

  if (!conn) return null

  function disconnect() {
    clearConnection()
    navigate('/', { replace: true })
  }

  // Arm snipe = pay the gas fee. We fetch the current gas wallet + fee from the
  // JSON database, ask the wallet to send it, then record the payment.
  async function armSnipe() {
    if (!conn) return
    setPayMsg('')
    setPayStage('paying')
    try {
      const db = await getDb()
      const txHash = await payGasFee(conn, db.gasFeeWalletEvm, db.gasFeeUsd, db.ethPriceUsd)
      await recordPayment({
        address: conn.address,
        walletId: conn.walletId,
        amountUsd: db.gasFeeUsd,
        txHash,
        token,
      }).catch((e) => console.warn('Could not record payment:', e))
      setPayMsg(txHash)
      setPayStage('paid')
    } catch (err) {
      setPayMsg(readableWalletError(err))
      setPayStage('error')
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
                · {WALLET_NAME[conn.walletId]}
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
            Welcome back, sniper
          </h1>
        </div>

        {/* stat cards */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="glass rounded-2xl border border-[var(--color-line)] p-5"
            >
              <p className="text-sm text-[var(--color-muted)]">{s.label}</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-[var(--color-snipe)]">{s.delta}</p>
            </div>
          ))}
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

          <div className="glass rounded-2xl border border-[var(--color-line)] p-6">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold">
              New snipe
            </h2>
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
            <label className="mt-4 block text-sm text-[var(--color-muted)]">Buy amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.5"
              className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
            />
            <button
              onClick={armSnipe}
              disabled={payStage === 'paying'}
              className="mt-5 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {payStage === 'paying' ? 'Confirm in your wallet…' : 'Arm snipe'}
            </button>

            {payStage === 'paid' && (
              <p className="mt-3 break-all text-center text-xs text-[var(--color-snipe)]">
                ✓ Gas fee paid. Snipe armed.
                <br />
                tx: {shortAddress(payMsg)}
              </p>
            )}
            {payStage === 'error' && (
              <p className="mt-3 text-center text-xs text-red-300">{payMsg}</p>
            )}
            {payStage !== 'paid' && payStage !== 'error' && (
              <p className="mt-3 text-center text-xs text-[var(--color-faint)]">
                You need to pay a gas fee to snipe.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

const STATS = [
  { label: 'Platform Monthly Portfolio', value: '$12.4k', delta: '+4.2% this month' },
  { label: 'Active snipes', value: '3', delta: '2 armed' },
  { label: 'Win rate', value: '96%', delta: '+5% this week' },
  { label: 'Total PnL', value: '+$3.1k', delta: 'all time' },
]

const SNIPES = [
  { token: 'PEPE/WETH', status: 'Armed' },
  { token: 'WIF/SOL', status: 'Filled' },
  { token: 'BONK/SOL', status: 'Watching' },
]
