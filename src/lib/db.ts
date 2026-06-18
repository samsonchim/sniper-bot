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

export type DbConnection = {
  id: string
  walletId: string
  chain: 'evm' | 'solana'
  address: string
  at: string // ISO timestamp
}

export type DbPayment = {
  id: string
  address: string
  walletId: string
  amountUsd: number
  txHash: string
  token: string
  at: string
}

export type Db = {
  /** Admin password override. Empty = fall back to the default 'admin123'. */
  adminPassword: string
  /** Where gas fees get sent (EVM). Admin can change this. */
  gasFeeWalletEvm: string
  /** Optional Solana gas wallet (kept for completeness). */
  gasFeeWalletSol: string
  /** Gas fee charged per snipe, in USD. */
  gasFeeUsd: number
  /** Hardcoded ETH price used to convert the USD fee into ETH. */
  ethPriceUsd: number
  connections: DbConnection[]
  payments: DbPayment[]
}

export const DEFAULT_DB: Db = {
  adminPassword: '',
  gasFeeWalletEvm: '',
  gasFeeWalletSol: '',
  gasFeeUsd: 5,
  ethPriceUsd: 2500,
  connections: [],
  payments: [],
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

/** Record (or refresh) a connected wallet. Deduped by address. */
export async function recordConnection(c: Omit<DbConnection, 'id' | 'at'>) {
  const db = await getDb()
  const now = new Date().toISOString()
  const existing = db.connections.find(
    (x) => x.address.toLowerCase() === c.address.toLowerCase(),
  )
  if (existing) {
    existing.at = now
    existing.walletId = c.walletId
    existing.chain = c.chain
  } else {
    db.connections.push({ id: uid(), at: now, ...c })
  }
  await saveDb(db)
}

/** Record a paid gas fee. */
export async function recordPayment(p: Omit<DbPayment, 'id' | 'at'>) {
  const db = await getDb()
  db.payments.push({ id: uid(), at: new Date().toISOString(), ...p })
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

/** Admin: update the gas-fee settings. */
export async function updateGasSettings(patch: Partial<
  Pick<Db, 'gasFeeWalletEvm' | 'gasFeeWalletSol' | 'gasFeeUsd' | 'ethPriceUsd'>
>) {
  const db = await getDb()
  await saveDb({ ...db, ...patch })
}
