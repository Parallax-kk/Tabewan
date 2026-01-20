import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getTwdToJpyRate } from '../services/exchangeRate'

type OrderItem = {
    dishKey: string
    dishNameZh: string
    dishNameJa: string
    kana: string
    pinyin: string
    priceNt: number
    count: number
}

type OrderData = {
    category: string
    shopName: string
    items: OrderItem[]
    savedAt: number
}

type RateState =
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'loaded'; twdToJpy: number }

const WO_YAO = {
    zh: '我要',
    pinyin: 'Wǒ yào',
    kana: 'ウォ ヤオ',
} as const

const COUNT_PHRASES: Record<
    number,
    {
        zh: string
        pinyin: string
        kana: string
    }
> = {
    1: { zh: '一份', pinyin: 'yí fèn', kana: 'イーフェン' },
    2: { zh: '兩份', pinyin: 'liǎng fèn', kana: 'リィァンフェン' },
    3: { zh: '三份', pinyin: 'sān fèn', kana: 'サンフェン' },
    4: { zh: '四份', pinyin: 'sì fèn', kana: 'スーフェン' },
    5: { zh: '五份', pinyin: 'wǔ fèn', kana: 'ウーフェン' },
    6: { zh: '六份', pinyin: 'liù fèn', kana: 'リゥフェン' },
    7: { zh: '七份', pinyin: 'qī fèn', kana: 'チーフェン' },
    8: { zh: '八份', pinyin: 'bā fèn', kana: 'バーフェン' },
    9: { zh: '九份', pinyin: 'jiǔ fèn', kana: 'ジョウフェン' },
    10: { zh: '十份', pinyin: 'shí fèn', kana: 'シーフェン' },
}

function getCountPhrase(count: number) {
    return COUNT_PHRASES[count] || { zh: `${count}份`, pinyin: '', kana: '' }
}

function storageKey(category: string, shopName: string) {
    return `tabewan:order:${category}:${shopName}`
}

function formatYen(value: number) {
    return `¥${new Intl.NumberFormat('ja-JP').format(value)}`
}

function speak(text: string) {
    const synth = window.speechSynthesis
    if (!synth) {
        alert('このブラウザでは音声読み上げに対応していません')
        return
    }

    synth.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'zh-TW'
    utter.rate = 0.80
    synth.speak(utter)
}

export default function OrderConfirmPage() {
    const params = useParams()
    const category = params.category ? decodeURIComponent(params.category) : ''
    const shopName = params.shopName ? decodeURIComponent(params.shopName) : ''

    const [order, setOrder] = useState<OrderData | null>(null)
    const [rateState, setRateState] = useState<RateState>({ type: 'loading' })

    useEffect(() => {
        const raw = sessionStorage.getItem(storageKey(category, shopName))
        if (!raw) {
            setOrder(null)
            return
        }

        try {
            const parsed = JSON.parse(raw) as OrderData
            setOrder(parsed)
        } catch {
            setOrder(null)
        }
    }, [category, shopName])

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

    const selectedItems = useMemo(() => {
        return (order?.items || []).filter((i) => i.count > 0)
    }, [order])

    const totalTwd = useMemo(() => {
        return selectedItems.reduce((sum, i) => sum + i.priceNt * i.count, 0)
    }, [selectedItems])

    const totalJpy = useMemo(() => {
        if (rateState.type !== 'loaded') return null
        return Math.round(totalTwd * rateState.twdToJpy)
    }, [totalTwd, rateState])

    if (!category || !shopName) {
        return (
            <main className="container py-4">
                <div className="alert alert-warning">URLが不正です。</div>
                <Link className="btn btn-primary tw-btn-primary" to="/">
                    最初へ
                </Link>
            </main>
        )
    }

    if (!order) {
        return (
            <main className="container py-4">
                <div className="alert alert-warning">
                    注文データが見つかりませんでした。もう一度メニューを選択してください。
                </div>
                <Link className="btn btn-primary tw-btn-primary" to={`/shops/${encodeURIComponent(category)}`}>
                    お店選択へ戻る
                </Link>
            </main>
        )
    }

    return (
        <main className="container py-4">
            <div className="mb-3">
                <div className="tw-page-title">注文の確認</div>
                <div className="text-secondary small">{order.shopName}</div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <div className="fw-semibold mb-2">選択したメニュー</div>
                    {selectedItems.length === 0 ? (
                        <div className="text-secondary">選択がありません。</div>
                    ) : (
                        <div className="list-group list-group-flush">
                            {selectedItems.map((i) => (
                                <div key={i.dishKey} className="list-group-item px-0 d-flex justify-content-between">
                                    <div>
                                        <div className="fw-semibold">{i.dishNameJa}</div>
                                        <div className="text-secondary small">
                                            {i.count} × NT$ {i.priceNt}
                                        </div>
                                    </div>
                                    <div className="text-end fw-semibold">NT$ {i.priceNt * i.count}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-2 mt-2 border-top d-flex justify-content-between align-items-end">
                        <div className="text-secondary small">
                            合計
                            {rateState.type === 'loading' && '（為替取得中）'}
                            {rateState.type === 'error' && '（為替取得失敗）'}
                        </div>
                        <div className="fw-bold">
                            NT$ {totalTwd}
                            {totalJpy !== null && (
                                <span className="text-secondary fw-normal"> {'/'} {formatYen(totalJpy)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">店員さんに伝える</div>
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                        const all = selectedItems
                            .map((i) => {
                                const countPhrase = getCountPhrase(i.count)
                                return `${WO_YAO.zh}${countPhrase.zh}${i.dishNameZh}`
                            })
                            .join('。')
                        if (all) speak(all)
                    }}
                    disabled={selectedItems.length === 0}
                >
                    <i className="bi bi-volume-up" aria-hidden /> 全部読み上げ
                </button>
            </div>

            <div className="d-grid gap-2">
                {selectedItems.map((i) => {
                    const countPhrase = getCountPhrase(i.count)
                    const taiwanese = `${WO_YAO.zh}${countPhrase.zh}${i.dishNameZh}`
                    const japanese = `${i.dishNameJa}を${i.count}人前ください`

                    return (
                        <div key={i.dishKey} className="card">
                            <div className="card-body">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="flex-grow-1">
                                        <div className="fw-semibold mb-1">台湾語</div>
                                        <div className="tw-say-tw">
                                            <ruby>
                                                {WO_YAO.zh}
                                                <rt>{WO_YAO.kana}</rt>
                                            </ruby>
                                            <ruby>
                                                {countPhrase.zh}
                                                <rt>{countPhrase.kana}</rt>
                                            </ruby>
                                            <ruby>
                                                {i.dishNameZh}
                                                <rt>{i.kana}</rt>
                                            </ruby>
                                        </div>
                                        <div className="text-secondary small">
                                            {WO_YAO.pinyin}
                                            {countPhrase.pinyin ? ` ${countPhrase.pinyin}` : ''}
                                            {i.pinyin ? ` ${i.pinyin}` : ''}
                                        </div>

                                        <div className="fw-semibold mt-2 mb-1">日本語</div>
                                        <div>{japanese}</div>

                                        <div className="fw-semibold mt-2 mb-1">ピンイン</div>
                                        <div className="text-secondary">{i.pinyin}</div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => speak(taiwanese)}
                                        aria-label="音声で読み上げ"
                                    >
                                        <i className="bi bi-volume-up" aria-hidden />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="d-grid gap-2 col-6 mx-auto mt-3">
                <Link
                    className="btn btn-outline-secondary btn-lg"
                    to={`/shops/${encodeURIComponent(category)}/${encodeURIComponent(shopName)}`}
                >
                    修正する
                </Link>
            </div>
        </main>
    )
}
