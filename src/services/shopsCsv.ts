import Papa from 'papaparse'

import type { Shop } from '../types/shop'

const DEFAULT_SHEET_SHARE_URL =
    'https://docs.google.com/spreadsheets/d/1X0oZ_Kpjgo9OQfjjUsz4WWMqXj9Uvgd4x7tVo40MtGo/edit?usp=sharing'

function toCsvUrls(sourceUrl: string): string[] {
    const idMatch = sourceUrl.match(/\/spreadsheets\/d\/([^/]+)/)
    if (!idMatch) return [sourceUrl]

    const id = idMatch[1]

    return [
        `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`,
        `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
    ]
}

async function fetchFirstOk(urls: string[]): Promise<string> {
    const errors: string[] = []

    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: 'no-store' })
            if (!response.ok) {
                errors.push(`${url} -> HTTP ${response.status}`)
                continue
            }
            return await response.text()
        } catch (error) {
            errors.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    throw new Error(`CSVの取得に失敗しました。\n${errors.join('\n')}`)
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
}

let shopsCache: Shop[] | null = null

export async function getShops(): Promise<Shop[]> {
    if (shopsCache) return shopsCache

    const sourceUrl = import.meta.env.VITE_SHOPS_CSV_URL || DEFAULT_SHEET_SHARE_URL
    const csvText = await fetchFirstOk(toCsvUrls(sourceUrl))

    const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
        const message = parsed.errors.map((e) => e.message).join('\n')
        throw new Error(`CSVの解析に失敗しました。\n${message}`)
    }

    const shops = (parsed.data || [])
        .map((row): Shop | null => {
            const category = (row['カテゴリ'] || '').trim()
            const shopName = (row['店名'] || '').trim()
            const dishNameZh = (row['料理名(台)'] || '').trim()
            const dishNameJa = (row['料理名(日)'] || '').trim()
            const kana = (row['読み(カナ)'] || '').trim()
            const pinyin = (row['ピンイン'] || '').trim()
            const priceNt = toNumber(row['値段(NT$)'])

            if (!category || !shopName || !dishNameZh || !dishNameJa ||
                !kana || !pinyin || !priceNt)
                return null

            return {
                category,
                shopName,
                dishNameZh,
                dishNameJa,
                kana,
                pinyin,
                priceNt,
            }
        })
        .filter((x): x is Shop => x !== null)

    shopsCache = shops
    return shops
}
