/**
 * Real wallet connection helpers.
 *
 * These talk to wallets that inject a provider into the page — i.e. browser
 * extensions (MetaMask, Coinbase Wallet, Phantom…) and the in-app dapp browsers
 * of their mobile apps. The user is prompted to APPROVE the connection in their
 * wallet; we never see a private key and never request a transaction here.
 */

export type WalletId = 'metamask' | 'walletconnect' | 'coinbase' | 'phantom'

export type Connection = {
  /** Which wallet the user picked. */
  walletId: WalletId
  /** Chain family the account belongs to. */
  chain: 'evm' | 'solana'
  /** The connected account address. */
  address: string
}

/* --- minimal provider typings (avoids pulling extra deps) ----------------- */
type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  providers?: Eip1193Provider[]
}

type SolanaProvider = {
  isPhantom?: boolean
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>
  disconnect?: () => Promise<void>
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
    phantom?: { solana?: SolanaProvider }
    solana?: SolanaProvider
  }
}

const STORAGE_KEY = 'shadowsnipe:connection'

/** Persisted connection so the dashboard survives a refresh. */
export function loadConnection(): Connection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Connection) : null
  } catch {
    return null
  }
}

export function saveConnection(c: Connection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
}

export function clearConnection() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Short, human-friendly form of an address: 0x5n1p…e4f2 */
export function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/**
 * Pick the right EVM provider when several extensions are installed. MetaMask
 * and Coinbase both set `window.ethereum`, but each tags itself, and when they
 * coexist they expose siblings under `.providers`.
 */
function pickEvmProvider(prefer: 'metamask' | 'coinbase' | 'any'): Eip1193Provider | null {
  const root = window.ethereum
  if (!root) return null
  const candidates = root.providers?.length ? root.providers : [root]
  if (prefer === 'metamask') {
    return candidates.find((p) => p.isMetaMask) ?? root
  }
  if (prefer === 'coinbase') {
    return candidates.find((p) => p.isCoinbaseWallet) ?? root
  }
  return root
}

/** Rough mobile detection — good enough to decide between deep link vs. extension. */
export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/**
 * Thrown when the right move is to send the user into a wallet app's in-app
 * browser (on mobile, where there's no injected provider). The UI catches this
 * and navigates to `url`.
 */
export class WalletRedirect extends Error {
  constructor(public url: string) {
    super('redirecting to wallet app')
  }
}

/**
 * Build a deep link that reopens THIS page inside the chosen wallet's in-app
 * browser, where the provider will be injected and the user can connect.
 */
function walletDeepLink(walletId: WalletId): string | null {
  const url = window.location.href
  const u = new URL(url)
  const hostPath = u.host + u.pathname + u.search // metamask wants host (no scheme)
  switch (walletId) {
    case 'metamask':
      return `https://metamask.app.link/dapp/${hostPath}`
    case 'coinbase':
      return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`
    case 'phantom':
      return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(u.origin)}`
    // WalletConnect isn't a single app, so there's no generic deep link.
    case 'walletconnect':
    default:
      return null
  }
}

/**
 * Request a connection from the chosen wallet. Resolves once the user APPROVES
 * in their wallet.
 *
 * On mobile with no injected provider, throws `WalletRedirect` so the caller can
 * open the wallet app's in-app browser. Otherwise rejects with a readable
 * message if the user declines or the wallet isn't available.
 */
export async function connectWallet(walletId: WalletId): Promise<Connection> {
  if (walletId === 'phantom') {
    const provider = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined)
    if (!provider) {
      if (isMobile()) {
        const link = walletDeepLink('phantom')
        if (link) throw new WalletRedirect(link)
      }
      throw new WalletError('Phantom not found. Install the Phantom extension or open this page in the Phantom app.')
    }
    const { publicKey } = await provider.connect()
    return { walletId, chain: 'solana', address: publicKey.toString() }
  }

  // Everything else is EVM via an injected EIP-1193 provider.
  const provider = pickEvmProvider(
    walletId === 'metamask' ? 'metamask' : walletId === 'coinbase' ? 'coinbase' : 'any',
  )
  if (!provider) {
    // On a phone there's no extension — hand off to the wallet app's browser.
    if (isMobile()) {
      const link = walletDeepLink(walletId)
      if (link) throw new WalletRedirect(link)
    }
    if (walletId === 'walletconnect') {
      throw new WalletError(
        'On mobile, pick MetaMask, Coinbase, or Phantom to open this page in your wallet app.',
      )
    }
    const name = LABELS[walletId]
    throw new WalletError(
      isMobile()
        ? `Open this page inside the ${name} app's browser to connect.`
        : `No ${name} provider detected. Install the extension, or open this page inside your wallet app's browser.`,
    )
  }

  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  if (!accounts?.length) throw new WalletError('No account was shared by the wallet.')
  return { walletId, chain: 'evm', address: accounts[0] }
}

/**
 * Send a real gas-fee payment in ETH to the given address, via the same wallet
 * the user connected with. `amountUsd` is converted to ETH using `ethPriceUsd`.
 * Resolves with the transaction hash once the user approves in their wallet.
 *
 * EVM only — Solana transfers use a different flow and aren't supported here.
 */
export async function payGasFee(
  conn: Connection,
  toAddress: string,
  amountUsd: number,
  ethPriceUsd: number,
): Promise<string> {
  if (conn.chain !== 'evm') {
    throw new WalletError('Gas payment requires an EVM wallet like MetaMask or Coinbase.')
  }
  if (!toAddress) {
    throw new WalletError('No gas-fee wallet is configured yet. Ask the admin to set one.')
  }
  const provider = pickEvmProvider(
    conn.walletId === 'metamask' ? 'metamask' : conn.walletId === 'coinbase' ? 'coinbase' : 'any',
  )
  if (!provider) throw new WalletError('Wallet provider not found. Reconnect your wallet.')

  // USD -> ETH -> wei, as a hex string.
  const eth = amountUsd / ethPriceUsd
  const wei = BigInt(Math.round(eth * 1e18))
  const valueHex = '0x' + wei.toString(16)

  const txHash = (await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from: conn.address, to: toAddress, value: valueHex }],
  })) as string
  return txHash
}

const LABELS: Record<WalletId, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
  phantom: 'Phantom',
}

/** Error with a message that's safe to show the user verbatim. */
export class WalletError extends Error {}

/** Normalise the grab-bag of errors wallets throw into a friendly string. */
export function readableWalletError(err: unknown): string {
  if (err instanceof WalletError) return err.message
  const e = err as { code?: number; message?: string }
  if (e?.code === 4001 || /reject|denied/i.test(e?.message ?? '')) {
    return 'Connection request was rejected in your wallet.'
  }
  if (e?.code === -32002 || /already pending/i.test(e?.message ?? '')) {
    return 'A connection request is already open — check your wallet.'
  }
  return e?.message || 'Could not connect. Please try again.'
}
