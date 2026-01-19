const ENDPOINT = 'https://open.er-api.com/v6/latest/TWD'

type ExchangeResponse = {
    result?: string
    rates?: Record<string, unknown>
}

let cache: { rate: number; fetchedAt: number } | null = null

const TTL_MS = 5 * 60 * 1000

export async function getTwdToJpyRate(): Promise<number> {
    const now = Date.now()
    if (cache && now - cache.fetchedAt < TTL_MS) return cache.rate

    const res = await fetch(ENDPOINT, { cache: 'no-store' })
    if (!res.ok) throw new Error(`為替レートの取得に失敗しました (HTTP ${res.status})`)

    const json = (await res.json()) as ExchangeResponse
    const rateRaw = json.rates?.JPY

    if (typeof rateRaw !== 'number' || !Number.isFinite(rateRaw)) {
        throw new Error('為替レートの形式が不正です（rates.JPY が見つかりません）')
    }

    cache = { rate: rateRaw, fetchedAt: now }
    return rateRaw
}
