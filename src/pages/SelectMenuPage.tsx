import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Shop } from '../types/shop'
import { getTwdToJpyRate } from '../services/exchangeRate'
import { getShops } from '../services/shopsCsv'

type Dish = {
    key: string
    dishNameZh: string
    dishNameJa: string
    kana: string
    pinyin: string
    priceNt: number
}

type OrderItem = {
    dishKey: string
    dishNameZh: string
    dishNameJa: string
    kana: string
    pinyin: string
    priceNt: number
    count: number
}

type LoadState =
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'loaded'; rows: Shop[] }

type RateState =
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'loaded'; twdToJpy: number }

const MAX_COUNT = 10

function dishKey(row: Shop) {
    return `${row.dishNameZh}||${row.dishNameJa}`
}

export default function SelectMenuPage() {
    const params = useParams()
    const category = params.category ? decodeURIComponent(params.category) : ''
    const shopName = params.shopName ? decodeURIComponent(params.shopName) : ''
    const navigate = useNavigate()

    const [state, setState] = useState<LoadState>({ type: 'loading' })
    const [counts, setCounts] = useState<Record<string, number>>({})
    const [rateState, setRateState] = useState<RateState>({ type: 'loading' })

    useEffect(() => {
        let cancelled = false

        async function run() {
            try {
                setState({ type: 'loading' })
                const rows = await getShops()
                if (cancelled) return
                setState({ type: 'loaded', rows })
            } catch (error) {
                if (cancelled) return
                setState({
                    type: 'error',
                    message: error instanceof Error ? error.message : String(error),
                })
            }
        }

        run()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function run() {
            try {
                setRateState({ type: 'loading' })
                const twdToJpy = await getTwdToJpyRate()
                if (cancelled) return
                setRateState({ type: 'loaded', twdToJpy })
            } catch (error) {
                if (cancelled) return
                setRateState({
                    type: 'error',
                    message: error instanceof Error ? error.message : String(error),
                })
            }
        }

        run()

        return () => {
            cancelled = true
        }
    }, [])

    const dishes = useMemo((): Dish[] => {
        if (state.type !== 'loaded') return []

        const filtered = state.rows
            .filter((r) => r.category === category && r.shopName === shopName)
            .sort((a, b) => a.dishNameJa.localeCompare(b.dishNameJa, 'ja-JP'))

        const map = new Map<string, Dish>()
        for (const row of filtered) {
            const key = dishKey(row)
            if (map.has(key)) continue
            map.set(key, {
                key,
                dishNameZh: row.dishNameZh,
                dishNameJa: row.dishNameJa,
                kana: row.kana,
                pinyin: row.pinyin,
                priceNt: row.priceNt,
            })
        }

        return Array.from(map.values())
    }, [state, category, shopName])

    const totalTwd = useMemo(() => {
        return dishes.reduce((sum, dish) => {
            const n = counts[dish.key] ?? 0
            return sum + (Number.isFinite(n) ? n : 0) * dish.priceNt
        }, 0)
    }, [counts, dishes])

    const totalJpy = useMemo(() => {
        if (rateState.type !== 'loaded') return null
        return Math.round(totalTwd * rateState.twdToJpy)
    }, [totalTwd, rateState])

    const formatYen = useMemo(() => {
        const nf = new Intl.NumberFormat('ja-JP')
        return (value: number) => `¥${nf.format(value)}`
    }, [])

    const selectedItems = useMemo((): OrderItem[] => {
        return dishes
            .map((dish) => {
                const count = counts[dish.key] ?? 0
                return {
                    dishKey: dish.key,
                    dishNameZh: dish.dishNameZh,
                    dishNameJa: dish.dishNameJa,
                    kana: dish.kana,
                    pinyin: dish.pinyin,
                    priceNt: dish.priceNt,
                    count,
                }
            })
            .filter((i) => i.count > 0)
    }, [dishes, counts])

    function saveAndGoNext() {
        const payload = {
            category,
            shopName,
            items: selectedItems,
            savedAt: Date.now(),
        }

        sessionStorage.setItem(
            `tabewan:order:${category}:${shopName}`,
            JSON.stringify(payload),
        )

        navigate(
            `/shops/${encodeURIComponent(category)}/${encodeURIComponent(shopName)}/confirm`,
        )
    }

    return (
        <main className="container py-4">
            <div className="mb-3">
                <div className="tw-page-title">{shopName || 'お店'}</div>
                <div className="text-secondary small">カテゴリ: {category || '-'}</div>
            </div>

            {state.type === 'loading' && <div className="text-secondary">読み込み中...</div>}

            {state.type === 'error' && (
                <div className="alert alert-warning">
                    <div className="fw-bold mb-2">データの取得に失敗しました</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{state.message}</div>
                </div>
            )}

            {state.type === 'loaded' && (
                <>
                    {dishes.length === 0 ? (
                        <div className="text-secondary">このお店の料理が見つかりませんでした。</div>
                    ) : (
                        <div className="list-group">
                            {dishes.map((dish) => {
                                const value = counts[dish.key] ?? 0
                                return (
                                    <div
                                        key={dish.key}
                                        className="list-group-item d-flex align-items-start justify-content-between gap-3"
                                    >
                                        <div className="flex-grow-1">
                                            <div className="fw-bold tw-dish-zh">{dish.dishNameZh}</div>
                                            <div className="text-secondary small">{dish.dishNameJa}</div>
                                            <div className="text-secondary small">{dish.pinyin}</div>
                                            <div className="mt-1 fw-semibold tw-nt-price">
                                                NT$ {dish.priceNt}
                                                {rateState.type === 'loaded' && (
                                                    <span className="text-secondary fw-normal">
                                                        {' '}/{' '}
                                                        {formatYen(Math.round(dish.priceNt * rateState.twdToJpy))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ width: 92 }}>
                                            <label className="form-label small text-secondary mb-1">個数</label>
                                            <select
                                                className="form-select"
                                                value={value}
                                                onChange={(e) => {
                                                    const next = Number(e.target.value)
                                                    setCounts((prev) => ({ ...prev, [dish.key]: next }))
                                                }}
                                            >
                                                {Array.from({ length: MAX_COUNT + 1 }, (_, i) => i).map((n) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="mt-3">
                        <div className="fw-semibold">
                            選択合計: NT$ {totalTwd}
                            {totalJpy !== null && (
                                <span className="text-secondary fw-normal"> {'/'} {formatYen(totalJpy)}</span>
                            )}
                        </div>
                        {rateState.type === 'loading' && (
                            <div className="text-secondary small">為替レート取得中...</div>
                        )}
                        {rateState.type === 'error' && (
                            <div className="text-secondary small" style={{ whiteSpace: 'pre-wrap' }}>
                                為替レート取得失敗: {rateState.message}
                            </div>
                        )}
                    </div>
                    <div className="d-grid gap-2 col-6 mx-auto">
                        <button
                            className="btn btn-primary btn-lg tw-btn-primary"
                            type="button"
                            onClick={saveAndGoNext}
                            disabled={selectedItems.length === 0}
                        >
                            次へ
                        </button>
                    </div>
                </>
            )
            }
        </main >
    )
}
