export type CategoryKey = 'レストラン' | '屋台・夜市' | 'スイーツ・カフェ' | 'その他'

export const CATEGORIES: Array<{
    key: CategoryKey
    emoji: string
}> = [
        { key: 'レストラン', emoji: '🍚' },
        { key: '屋台・夜市', emoji: '🍢' },
        { key: 'スイーツ・カフェ', emoji: '🍧' },
        { key: 'その他', emoji: '✨' },
    ]
