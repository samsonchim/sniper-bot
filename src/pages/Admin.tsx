import { useEffect, useState } from 'react'
import { getDb, updateGasSettings, type Db } from '../lib/db'

const ADMIN_PASSWORD = 'admin123' // hardcoded for the assignment

/**
 * Admin dashboard. Gated by a hardcoded password (client-side only — fine for a
 * school assignment, NOT real security). Shows every connected wallet and every
 * gas-fee payment from the JSON database, and lets the admin change the wallet
 * that gas fees are sent to.
 */
export function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')

  if (!authed) {
    return (
      <Shell>
        <div className="glass mx-auto mt-24 w-full max-w-sm rounded-2xl border border-[var(--color-line)] p-6">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Enter the admin password.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (pw === ADMIN_PASSWORD) {
                setAuthed(true)
                setPwError('')
              } else {
                setPwError('Wrong password.')
              }
            }}
          >
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              autoFocus
              className="mt-4 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
            />
            {pwError && <p className="mt-2 text-xs text-red-300">{pwError}</p>}
            <button className="mt-4 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110">
              Sign in
            </button>
          </form>
        </div>
      </Shell>
    )
  }

  return <AdminPanel />
}

function AdminPanel() {
  const [db, setDb] = useState<Db | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // gas settings form
  const [evm, setEvm] = useState('')
  const [sol, setSol] = useState('')
  const [feeUsd, setFeeUsd] = useState('5')
  const [saved, setSaved] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await getDb()
      setDb(data)
      setEvm(data.gasFeeWalletEvm)
      setSol(data.gasFeeWalletSol)
      setFeeUsd(String(data.gasFeeUsd))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function saveGas(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setError('')
    try {
      await updateGasSettings({
        gasFeeWalletEvm: evm.trim(),
        gasFeeWalletSol: sol.trim(),
        gasFeeUsd: Number(feeUsd) || 0,
      })
      setSaved(true)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          Admin dashboard
        </h1>
        <button
          onClick={load}
          className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {loading && <p className="mt-4 text-sm text-[var(--color-muted)]">Loading…</p>}

      {db && (
        <>
          {/* gas-fee wallet editor */}
          <section className="glass mt-6 rounded-2xl border border-[var(--color-line)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Gas-fee settings
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Where collected gas fees are sent, and how much each snipe costs.
            </p>
            <form onSubmit={saveGas} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm text-[var(--color-muted)]">EVM gas-fee wallet</span>
                <input
                  value={evm}
                  onChange={(e) => setEvm(e.target.value)}
                  placeholder="0x…"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm text-[var(--color-muted)]">Solana gas-fee wallet</span>
                <input
                  value={sol}
                  onChange={(e) => setSol(e.target.value)}
                  placeholder="Solana address"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--color-muted)]">Gas fee (USD)</span>
                <input
                  value={feeUsd}
                  onChange={(e) => setFeeUsd(e.target.value)}
                  inputMode="decimal"
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                />
              </label>
              <div className="flex items-end gap-3">
                <button className="rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110">
                  Save settings
                </button>
                {saved && <span className="text-sm text-[var(--color-snipe)]">Saved ✓</span>}
              </div>
            </form>
          </section>

          {/* stats */}
          <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Connected wallets" value={db.connections.length} />
            <Stat label="Paid gas fee" value={db.payments.length} />
            <Stat
              label="Fees collected"
              value={`$${db.payments.reduce((s, p) => s + p.amountUsd, 0)}`}
            />
          </section>

          {/* connected wallets */}
          <Table
            title="Connected wallets"
            head={['Address', 'Wallet', 'Chain', 'When']}
            empty="No wallets connected yet."
            rows={[...db.connections].reverse().map((c) => [
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-snipe)]">
                {c.address}
              </span>,
              c.walletId,
              c.chain,
              new Date(c.at).toLocaleString(),
            ])}
          />

          {/* payments */}
          <Table
            title="Gas-fee payments"
            head={['Address', 'Amount', 'Token', 'Tx', 'When']}
            empty="No payments yet."
            rows={[...db.payments].reverse().map((p) => [
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-snipe)]">
                {p.address}
              </span>,
              `$${p.amountUsd}`,
              <span className="font-[family-name:var(--font-mono)]">{p.token}</span>,
              <span className="font-[family-name:var(--font-mono)] text-xs">{p.txHash}</span>,
              new Date(p.at).toLocaleString(),
            ])}
          />
        </>
      )}
    </Shell>
  )
}

/* --- small presentational helpers ---------------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--color-void)] text-[var(--color-fg)]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl border border-[var(--color-line)] p-5">
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">{value}</p>
    </div>
  )
}

function Table({
  title,
  head,
  rows,
  empty,
}: {
  title: string
  head: string[]
  rows: React.ReactNode[][]
  empty: string
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold">{title}</h2>
      <div className="glass overflow-x-auto rounded-2xl border border-[var(--color-line)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-[var(--color-faint)]">
            <tr>
              {head.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={head.length}
                  className="px-4 py-6 text-center text-[var(--color-muted)]"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((cells, i) => (
                <tr key={i} className="border-t border-[var(--color-line)]">
                  {cells.map((c, j) => (
                    <td key={j} className="whitespace-nowrap px-4 py-3">
                      {c}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
