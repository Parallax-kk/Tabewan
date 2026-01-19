import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Shop } from '../types/shop'
import { getShops } from '../services/shopsCsv'

type LoadState =
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'loaded'; shops: Shop[] }

export default function SelectShopPage() {
    const params = useParams()
    const category = params.category ? decodeURIComponent(params.category) : ''
    const navigate = useNavigate()

    const [state, setState] = useState<LoadState>({ type: 'loading' })

    useEffect(() => {
        let cancelled = false

        async function run() {
            try {
                setState({ type: 'loading' })
                const shops = await getShops()
                if (cancelled) return
                setState({ type: 'loaded', shops })
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

    const filtered = useMemo(() => {
        if (state.type !== 'loaded') return []
        const sorted = state.shops
            .filter((s) => s.category === category)
            .sort((a, b) => a.shopName.localeCompare(b.shopName, 'ja-JP'))

        const seen = new Set<string>()
        const unique: Shop[] = []
        for (const shop of sorted) {
            if (seen.has(shop.shopName)) continue
            seen.add(shop.shopName)
            unique.push(shop)
        }
        return unique
    }, [state, category])

    return (
        <main className="container py-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <div className="tw-page-title">お店を選択</div>
                    <div className="text-secondary small">カテゴリ: {category || '-'}</div>
                </div>
            </div>

            {state.type === 'loading' && (
                <div className="text-secondary">読み込み中...</div>
            )}

            {state.type === 'error' && (
                <div className="alert alert-warning">
                    <div className="fw-bold mb-2">データの取得に失敗しました</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{state.message}</div>
                    <div className="mt-2 small text-secondary">
                        スプレッドシートが非公開の場合は公開設定が必要です。
                    </div>
                </div>
            )}

            {state.type === 'loaded' && (
                <>
                    {filtered.length === 0 ? (
                        <div className="text-secondary">このカテゴリのお店が見つかりませんでした。</div>
                    ) : (
                        <div className="list-group">
                            {filtered.map((shop) => (
                                <button
                                    key={shop.shopName}
                                    type="button"
                                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                                    onClick={() => {
                                        navigate(
                                            `/shops/${encodeURIComponent(category)}/${encodeURIComponent(shop.shopName)}`,
                                        )
                                    }}
                                >
                                    <span className="fw-semibold">{shop.shopName}</span>
                                    <span className="text-secondary">›</span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </main>
    )
}
