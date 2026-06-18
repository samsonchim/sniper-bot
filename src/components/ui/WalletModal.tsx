import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  connectWallet,
  readableWalletError,
  saveConnection,
  shortAddress,
  WalletRedirect,
  type Connection,
  type WalletId,
} from '../../lib/wallet'
import { recordConnection } from '../../lib/db'

type Wallet = { id: WalletId; name: string; glyph: string; tint: string; kind: string }

const WALLETS: Wallet[] = [
  { id: 'metamask', name: 'MetaMask', glyph: '🦊', tint: '#f6851b', kind: 'Extension · App' },
  { id: 'walletconnect', name: 'WalletConnect', glyph: '🔗', tint: '#3b99fc', kind: 'App' },
  { id: 'coinbase', name: 'Coinbase Wallet', glyph: '🪙', tint: '#1652f0', kind: 'Extension · App' },
  { id: 'phantom', name: 'Phantom', glyph: '👻', tint: '#ab9ff2', kind: 'Extension · App' },
]

type Stage = 'select' | 'connecting' | 'connected' | 'error' | 'redirecting'

/**
 * Wallet connect modal. On a chosen wallet it asks the real provider to
 * connect; once the user approves in their wallet (extension or app) we persist
 * the connection and redirect to the dashboard.
 */
export function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('select')
  const [picked, setPicked] = useState<Wallet | null>(null)
  const [conn, setConn] = useState<Connection | null>(null)
  const [error, setError] = useState<string>('')

  // Reset whenever it opens; close on Escape.
  useEffect(() => {
    if (open) {
      setStage('select')
      setPicked(null)
      setConn(null)
      setError('')
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function choose(w: Wallet) {
    setPicked(w)
    setError('')
    setStage('connecting')
    try {
      const connection = await connectWallet(w.id)
      saveConnection(connection)
      setConn(connection)
      // Save to the JSON database so the admin can see it. Don't block the user
      // if the write fails — the local connection is what matters for them.
      recordConnection({
        walletId: connection.walletId,
        chain: connection.chain,
        address: connection.address,
      }).catch((e) => console.warn('Could not record connection:', e))
      setStage('connected')
      // Brief beat so the success state is visible, then go to the dashboard.
      window.setTimeout(() => {
        onClose()
        navigate('/dashboard')
      }, 900)
    } catch (err) {
      // On mobile with no extension: hand off to the wallet app's browser.
      if (err instanceof WalletRedirect) {
        setStage('redirecting')
        window.location.href = err.url
        return
      }
      setError(readableWalletError(err))
      setStage('error')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Connect a wallet"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: 'rise .3s ease both' }}
      />

      <div
        className="glass relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ animation: 'rise .4s cubic-bezier(.22,1,.36,1) both' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Connect wallet
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-white/5 hover:text-white"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {stage === 'select' && (
          <div className="space-y-2">
            {WALLETS.map((w) => (
              <button
                key={w.id}
                onClick={() => choose(w)}
                className="group flex w-full items-center gap-4 rounded-xl border border-[var(--color-line)] bg-white/[0.02] px-4 py-3 text-left transition hover:border-[var(--color-snipe)]/50 hover:bg-white/[0.05]"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-lg text-xl"
                  style={{ background: `${w.tint}22` }}
                >
                  {w.glyph}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{w.name}</span>
                  <span className="block text-xs text-[var(--color-faint)]">{w.kind}</span>
                </span>
                <span className="text-[var(--color-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--color-snipe)]">
                  →
                </span>
              </button>
            ))}
          </div>
        )}

        {stage === 'connecting' && (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="relative grid h-20 w-20 place-items-center">
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-snipe)]" />
              <span className="text-3xl">{picked?.glyph}</span>
            </div>
            <div>
              <p className="font-medium">Connecting to {picked?.name}…</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Approve the connection in your wallet.
              </p>
            </div>
          </div>
        )}

        {stage === 'redirecting' && (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <div className="relative grid h-20 w-20 place-items-center">
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-snipe)]" />
              <span className="text-3xl">{picked?.glyph}</span>
            </div>
            <div>
              <p className="font-medium">Opening the {picked?.name} app…</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Continue in {picked?.name}’s built-in browser. If nothing happens,
                make sure the {picked?.name} app is installed.
              </p>
            </div>
          </div>
        )}

        {stage === 'connected' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-snipe)]/15 text-3xl glow-snipe">
              ✓
            </div>
            <div>
              <p className="font-medium">Connected</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-sm text-[var(--color-snipe)]">
                {conn ? shortAddress(conn.address) : ''}
              </p>
            </div>
            <p className="text-sm text-[var(--color-muted)]">Taking you to your dashboard…</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-red-500/15 text-3xl">
              ⚠
            </div>
            <div>
              <p className="font-medium">Couldn’t connect to {picked?.name}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStage('select')}
                className="rounded-lg border border-[var(--color-line)] px-5 py-2 font-semibold transition hover:bg-white/5"
              >
                Back
              </button>
              {picked && (
                <button
                  onClick={() => choose(picked)}
                  className="rounded-lg bg-[var(--color-snipe)] px-5 py-2 font-semibold text-black transition hover:brightness-110"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-relaxed text-[var(--color-faint)]">
          We never see your keys and never request a transaction to connect.
          Connecting a wallet is always free.
        </p>
      </div>
    </div>
  )
}
