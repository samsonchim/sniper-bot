import { useEffect, useState } from 'react'
import {
  getAdminPassword,
  getDb,
  setAdminPassword,
  updateDepositSettings,
  updateUserStats,
  type Db,
  type DbConnection,
} from '../lib/db'

/**
 * Admin dashboard. Gated by a password stored in the JSON database (an admin can
 * change it here); if none is set it falls back to the default 'admin123'.
 * Client-side only — fine for a school assignment, NOT real security. Shows
 * every connected wallet/user, their deposits, and lets the admin change the
 * deposit addresses, the gas fee, the password, and each user's profit/PnL.
 */
export function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [checking, setChecking] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setChecking(true)
    setPwError('')
    try {
      const expected = await getAdminPassword()
      if (pw === expected) setAuthed(true)
      else setPwError('Wrong password.')
    } catch {
      // If the DB can't be read, allow the default so admin isn't locked out.
      if (pw === 'admin123') setAuthed(true)
      else setPwError('Could not verify (database unreachable). Try the default password.')
    } finally {
      setChecking(false)
    }
  }

  if (!authed) {
    return (
      <Shell>
        <div className="glass mx-auto mt-24 w-full max-w-sm rounded-2xl border border-[var(--color-line)] p-6">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Enter the admin password.</p>
          <form onSubmit={login}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              autoFocus
              className="mt-4 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
            />
            {pwError && <p className="mt-2 text-xs text-red-300">{pwError}</p>}
            <button
              disabled={checking}
              className="mt-4 w-full rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {checking ? 'Checking…' : 'Sign in'}
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

  // deposit settings form
  const [xrp, setXrp] = useState('')
  const [btc, setBtc] = useState('')
  const [sol, setSol] = useState('')
  const [evmGas, setEvmGas] = useState('')
  const [ethPrice, setEthPrice] = useState('2500')
  const [feeUsd, setFeeUsd] = useState('5')
  const [saved, setSaved] = useState(false)

  // change-password form
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwOk, setPwOk] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await getDb()
      setDb(data)
      setXrp(data.depositWalletXrp)
      setBtc(data.depositWalletBtc)
      setSol(data.depositWalletSol)
      setEvmGas(data.gasFeeWalletEvm)
      setEthPrice(String(data.ethPriceUsd))
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

  async function saveDeposits(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setError('')
    try {
      await updateDepositSettings({
        depositWalletXrp: xrp.trim(),
        depositWalletBtc: btc.trim(),
        depositWalletSol: sol.trim(),
        gasFeeWalletEvm: evmGas.trim(),
        ethPriceUsd: Number(ethPrice) || 2500,
        gasFeeUsd: Number(feeUsd) || 0,
      })
      setSaved(true)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg('')
    setPwOk(false)
    if (newPw.length < 4) {
      setPwMsg('Password must be at least 4 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg('Passwords do not match.')
      return
    }
    try {
      await setAdminPassword(newPw)
      setPwOk(true)
      setNewPw('')
      setConfirmPw('')
    } catch (e) {
      setPwMsg((e as Error).message)
    }
  }

  const totalDeposited = db?.connections.reduce((s, c) => s + (c.deposited ?? 0), 0) ?? 0

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
          {/* deposit wallets */}
          <section className="glass mt-6 rounded-2xl border border-[var(--color-line)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Deposit wallets
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Deposit addresses back the QR codes on the user dashboard. The EVM gas wallet
              receives the withdrawal gas fee that users approve in-wallet.
            </p>
            <form onSubmit={saveDeposits} className="mt-4 grid gap-4">
              <Field label="XRP address" value={xrp} onChange={setXrp} mono />
              <Field label="Bitcoin (BTC) address" value={btc} onChange={setBtc} mono />
              <Field label="Solana (SOL) address" value={sol} onChange={setSol} mono />
              <Field
                label="EVM gas-fee wallet (receives approved gas fees)"
                value={evmGas}
                onChange={setEvmGas}
                mono
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-[var(--color-muted)]">Withdrawal gas fee (USD)</span>
                  <input
                    value={feeUsd}
                    onChange={(e) => setFeeUsd(e.target.value)}
                    inputMode="decimal"
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-[var(--color-muted)]">ETH price (USD)</span>
                  <input
                    value={ethPrice}
                    onChange={(e) => setEthPrice(e.target.value)}
                    inputMode="decimal"
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110">
                  Save settings
                </button>
                {saved && <span className="text-sm text-[var(--color-snipe)]">Saved ✓</span>}
              </div>
            </form>
          </section>

          {/* change admin password */}
          <section className="glass mt-6 rounded-2xl border border-[var(--color-line)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Admin password
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Set a new password. This overrides the default “admin123”.
            </p>
            <form onSubmit={savePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-[var(--color-muted)]">New password</span>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--color-muted)]">Confirm password</span>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-snipe)]/60"
                />
              </label>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button className="rounded-lg bg-[var(--color-snipe)] px-5 py-2.5 font-semibold text-black transition hover:brightness-110">
                  Update password
                </button>
                {pwOk && <span className="text-sm text-[var(--color-snipe)]">Password updated ✓</span>}
                {pwMsg && <span className="text-sm text-red-300">{pwMsg}</span>}
              </div>
            </form>
          </section>

          {/* stats */}
          <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Users / wallets" value={db.connections.length} />
            <Stat label="Deposits" value={db.deposits.length} />
            <Stat label="Withdrawals" value={db.withdrawals.length} />
            <Stat label="Total deposited" value={`$${totalDeposited.toLocaleString()}`} />
          </section>

          {/* users — editable profit / pnl / deposited */}
          <section className="mt-6">
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold">
              Users — set profit &amp; PnL
            </h2>
            <div className="glass overflow-x-auto rounded-2xl border border-[var(--color-line)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.02] text-[var(--color-faint)]">
                  <tr>
                    {['User', 'Address', 'Wallet', 'Deposited $', 'Profit $', 'PnL $', ''].map(
                      (h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {db.connections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-muted)]">
                        No users yet.
                      </td>
                    </tr>
                  ) : (
                    [...db.connections]
                      .reverse()
                      .map((c) => <UserRow key={c.id} user={c} onSaved={load} />)
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* withdrawals */}
          <Table
            title="Withdrawal requests"
            head={['User', 'Address', 'Amount', 'Gas paid', 'Gas via', 'Status', 'When']}
            empty="No withdrawal requests yet."
            rows={[...db.withdrawals].reverse().map((w) => [
              w.username ?? '—',
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-snipe)]">
                {w.address}
              </span>,
              `$${w.amountUsd}`,
              `$${w.gasUsd}`,
              w.gasTxHash ? (
                <span className="font-[family-name:var(--font-mono)] text-xs">
                  {w.gasTxHash.slice(0, 10)}…
                </span>
              ) : (
                (w.gasAsset ?? '—')
              ),
              w.status,
              new Date(w.at).toLocaleString(),
            ])}
          />

          {/* deposits */}
          <Table
            title="Deposits"
            head={['User', 'Address', 'Asset', 'Amount', 'When']}
            empty="No deposits yet."
            rows={[...db.deposits].reverse().map((d) => [
              d.username ?? '—',
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-snipe)]">
                {d.address}
              </span>,
              d.asset,
              `$${d.amountUsd}`,
              new Date(d.at).toLocaleString(),
            ])}
          />
        </>
      )}
    </Shell>
  )
}

/** One editable user row: change deposited / profit / pnl and save. */
function UserRow({ user, onSaved }: { user: DbConnection; onSaved: () => void }) {
  const [deposited, setDeposited] = useState(String(user.deposited ?? 0))
  const [profit, setProfit] = useState(String(user.profit ?? 0))
  const [pnl, setPnl] = useState(String(user.pnl ?? 0))
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function save() {
    setBusy(true)
    setOk(false)
    try {
      await updateUserStats(user.address, {
        deposited: Number(deposited) || 0,
        profit: Number(profit) || 0,
        pnl: Number(pnl) || 0,
      })
      setOk(true)
      onSaved()
      window.setTimeout(() => setOk(false), 1500)
    } catch {
      /* surfaced by parent on next load */
    } finally {
      setBusy(false)
    }
  }

  const cell =
    'w-24 rounded-md border border-[var(--color-line)] bg-white/[0.02] px-2 py-1 font-[family-name:var(--font-mono)] text-sm outline-none focus:border-[var(--color-snipe)]/60'

  return (
    <tr className="border-t border-[var(--color-line)]">
      <td className="whitespace-nowrap px-4 py-3 font-medium">{user.username ?? '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 font-[family-name:var(--font-mono)] text-[var(--color-snipe)]">
        {user.address.slice(0, 10)}…{user.address.slice(-6)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">{user.walletId}</td>
      <td className="px-4 py-3">
        <input value={deposited} onChange={(e) => setDeposited(e.target.value)} className={cell} />
      </td>
      <td className="px-4 py-3">
        <input value={profit} onChange={(e) => setProfit(e.target.value)} className={cell} />
      </td>
      <td className="px-4 py-3">
        <input value={pnl} onChange={(e) => setPnl(e.target.value)} className={cell} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-[var(--color-snipe)] px-3 py-1 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? '…' : ok ? 'Saved ✓' : 'Save'}
        </button>
      </td>
    </tr>
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

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full rounded-lg border border-[var(--color-line)] bg-white/[0.02] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-snipe)]/60 ${
          mono ? 'font-[family-name:var(--font-mono)]' : ''
        }`}
      />
    </label>
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
