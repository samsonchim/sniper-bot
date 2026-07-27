/**
 * Real wallet connection helpers.
 *
 * These talk to wallets that inject a provider into the page — i.e. browser
 * extensions (MetaMask, Coinbase Wallet, Phantom…) and the in-app dapp browsers
 * of their mobile apps. The user is prompted to APPROVE the connection in their
 * wallet; we never see a private key and never request a transaction here.
 */

export type WalletId =
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'phantom'
  | 'okx'
  | 'trust'
  | 'binance'
  | 'blockchain'
  | 'bybit'

export type Connection = {
  /** Which wallet the user picked. */
  walletId: WalletId
  /** Chain family the account belongs to. */
  chain: 'evm' | 'solana'
  /** The connected account address. */
  address: string
  /** How we're talking to the wallet — an injected provider or WalletConnect. */
  via?: 'injected' | 'walletconnect'
  /** Display name chosen on first sign-in. */
  username?: string
}

/* --- minimal provider typings (avoids pulling extra deps) ----------------- */
type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isTrust?: boolean
  isTrustWallet?: boolean
  isOkxWallet?: boolean
  isOKExWallet?: boolean
  isBybit?: boolean
  isBlockchain?: boolean
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
    okxwallet?: Eip1193Provider
    trustwallet?: Eip1193Provider
    bybitWallet?: Eip1193Provider
    BinanceChain?: Eip1193Provider
    blockchain?: { ethereum?: Eip1193Provider }
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
  // Best-effort: tear down any live WalletConnect session too.
  if (wcPromise) wcPromise.then((p) => p.disconnect?.()).catch(() => {})
}

/** Short, human-friendly form of an address: 0x5n1p…e4f2 */
export function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/**
 * Pick the right EVM provider for the chosen wallet. Many extensions all set
 * `window.ethereum`, but each tags itself, and when they coexist they expose
 * siblings under `.providers`. Some wallets also expose a dedicated object
 * (e.g. `window.okxwallet`), which we prefer when present.
 */
function pickEvmProvider(walletId: WalletId): Eip1193Provider | null {
  // Wallets that inject a dedicated, unambiguous object.
  switch (walletId) {
    case 'okx':
      if (window.okxwallet) return window.okxwallet
      break
    case 'trust':
      if (window.trustwallet) return window.trustwallet
      break
    case 'bybit':
      if (window.bybitWallet) return window.bybitWallet
      break
    case 'binance':
      if (window.BinanceChain) return window.BinanceChain
      break
    case 'blockchain':
      if (window.blockchain?.ethereum) return window.blockchain.ethereum
      break
  }

  const root = window.ethereum
  if (!root) return null
  const candidates = root.providers?.length ? root.providers : [root]

  // Otherwise match by the wallet's self-identifying flag on window.ethereum.
  const match = (p: Eip1193Provider): boolean => {
    switch (walletId) {
      case 'metamask':
        return !!p.isMetaMask
      case 'coinbase':
        return !!p.isCoinbaseWallet
      case 'trust':
        return !!(p.isTrust || p.isTrustWallet)
      case 'okx':
        return !!(p.isOkxWallet || p.isOKExWallet)
      case 'bybit':
        return !!p.isBybit
      case 'blockchain':
        return !!p.isBlockchain
      default:
        return false
    }
  }
  const found = candidates.find(match)
  if (found) return found
  // No positive match. If exactly one provider is injected, use it as a best
  // effort (single-wallet setups often don't set a recognisable flag). If
  // several coexist we can't safely guess — signal "not found" so the caller
  // falls back to the mobile deep link or a clear error instead of connecting
  // the WRONG wallet.
  return candidates.length === 1 ? candidates[0] : null
}

/** Rough mobile detection — good enough to decide between deep link vs. extension. */
export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

/* --- WalletConnect v2 ----------------------------------------------------- */

/** WalletConnect Cloud project id (https://cloud.walletconnect.com). */
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

export function isWalletConnectConfigured(): boolean {
  return Boolean(WC_PROJECT_ID)
}

/** WalletConnect's provider is EIP-1193 plus a few session helpers. */
type WcProvider = Eip1193Provider & {
  enable: () => Promise<string[]>
  accounts?: string[]
  disconnect?: () => Promise<void>
}

// Init is expensive and holds the session, so build it once and reuse it.
let wcPromise: Promise<WcProvider> | null = null

async function getWalletConnectProvider(): Promise<WcProvider> {
  if (!WC_PROJECT_ID) {
    throw new WalletError('WalletConnect is not set up. Ask the admin to configure it.')
  }
  if (!wcPromise) {
    wcPromise = (async () => {
      // Dynamic import keeps the (large) SDK out of the initial bundle.
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
      const provider = await EthereumProvider.init({
        projectId: WC_PROJECT_ID!,
        chains: [1], // Ethereum mainnet
        showQrModal: true, // QR on desktop, wallet list + deep links on mobile
        methods: ['eth_sendTransaction', 'personal_sign', 'wallet_switchEthereumChain'],
        events: ['chainChanged', 'accountsChanged'],
        metadata: {
          name: 'Web3Chainbot',
          description: 'Connect your wallet to Web3Chainbot',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
        },
      })
      return provider as unknown as WcProvider
    })()
  }
  return wcPromise
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
    case 'trust':
      return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`
    case 'okx':
      return `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${url}`)}`
    case 'bybit':
      return `https://www.bybit.com/app/wallet/dapp?url=${encodeURIComponent(url)}`
    // WalletConnect / Binance / Blockchain have no reliable generic deep link.
    case 'binance':
    case 'blockchain':
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

  // Everything else is EVM. Prefer a directly-injected provider (fastest, and
  // no QR): a browser extension, or a wallet app's in-app dapp browser.
  const provider = pickEvmProvider(walletId)
  if (provider) {
    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
    if (!accounts?.length) throw new WalletError('No account was shared by the wallet.')
    return { walletId, chain: 'evm', address: accounts[0], via: 'injected' }
  }

  // No injected provider (typical on a mobile browser, or desktop without the
  // extension). Use WalletConnect: it works for every wallet on iOS + Android
  // with no per-wallet deep-link guesswork — QR on desktop, wallet list on phone.
  if (isWalletConnectConfigured()) {
    return connectViaWalletConnect(walletId)
  }

  // WalletConnect isn't configured — fall back to the old mobile deep-link handoff.
  if (isMobile()) {
    const link = walletDeepLink(walletId)
    if (link) throw new WalletRedirect(link)
  }
  const name = LABELS[walletId]
  throw new WalletError(
    isMobile()
      ? `Open this page inside the ${name} app's browser to connect.`
      : `No ${name} provider detected. Install the extension, or open this page inside your wallet app's browser.`,
  )
}

/** Connect through the WalletConnect modal and return the chosen EVM account. */
async function connectViaWalletConnect(walletId: WalletId): Promise<Connection> {
  const wc = await getWalletConnectProvider()
  // enable() opens the WalletConnect modal and resolves once the user approves.
  const accounts = await wc.enable()
  const address = accounts?.[0] ?? wc.accounts?.[0]
  if (!address) throw new WalletError('No account was shared by the wallet.')
  return { walletId, chain: 'evm', address, via: 'walletconnect' }
}

/**
 * Charge the gas fee straight from the user's connected wallet: pops the wallet
 * to APPROVE a transfer of `amountUsd` (converted to ETH via `ethPriceUsd`) to
 * `toAddress`. Resolves with the tx hash once approved.
 *
 * EVM only — Solana wallets use the manual deposit-address fallback instead.
 */
export async function payGasFee(
  conn: Connection,
  toAddress: string,
  amountUsd: number,
  ethPriceUsd: number,
): Promise<string> {
  if (conn.chain !== 'evm') {
    throw new WalletError('This wallet can’t approve the fee in-app — pay it to the address shown.')
  }
  if (!toAddress) {
    throw new WalletError('No gas-fee wallet is configured yet. Ask the admin to set one.')
  }
  const provider = await resolveEvmProvider(conn)

  // Force Ethereum MAINNET (chainId 0x1) so this is always real ETH, never a
  // testnet. If the wallet is on another network it'll prompt the user to switch.
  await ensureMainnet(provider)

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

/** Get the live EVM provider for an existing connection (injected or WalletConnect). */
async function resolveEvmProvider(conn: Connection): Promise<Eip1193Provider> {
  if (conn.via === 'walletconnect') return getWalletConnectProvider()
  const provider = pickEvmProvider(conn.walletId)
  if (!provider) throw new WalletError('Wallet provider not found. Reconnect your wallet.')
  return provider
}

/** Ethereum mainnet chain id, as the hex string wallets expect. */
const MAINNET_CHAIN_ID = '0x1'

/** Make sure the wallet is on Ethereum mainnet, switching it if it isn't. */
async function ensureMainnet(provider: Eip1193Provider) {
  try {
    const current = (await provider.request({ method: 'eth_chainId' })) as string
    if (current?.toLowerCase() === MAINNET_CHAIN_ID) return
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MAINNET_CHAIN_ID }],
    })
  } catch (err) {
    // 4902 = chain not added; mainnet is built into every wallet, so any failure
    // here means the user declined or the wallet can't switch.
    const e = err as { code?: number }
    if (e?.code === 4001) {
      throw new WalletError('Please switch your wallet to Ethereum Mainnet to pay the fee.')
    }
    throw new WalletError('Could not switch your wallet to Ethereum Mainnet. Switch it manually and retry.')
  }
}

const LABELS: Record<WalletId, string> = {
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
