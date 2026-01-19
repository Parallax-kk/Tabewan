import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import SelectShopPage from './pages/SelectShopPage'
import SelectSituationPage from './pages/SelectSituationPage'
import SelectMenuPage from './pages/SelectMenuPage'
import OrderConfirmPage from './pages/OrderConfirmPage'

function AppLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const isRoot = location.pathname === '/'

    const subtitle = (() => {
        if (isRoot) return 'どこで注文しますか？'
        if (/^\/shops\/[^/]+\/[^/]+\/confirm$/.test(location.pathname)) return '注文を確認してください'
        if (/^\/shops\/[^/]+\/[^/]+/.test(location.pathname)) return '料理の個数を選択してください'
        return 'お店を選択してください'
    })()

    return (
        <div className="min-vh-100 bg-light">
            <header className="tw-navbar">
                <div className="container h-100 position-relative d-flex flex-column align-items-center justify-content-end pb-2">
                    <div className="tw-navbar-actions" aria-label="ヘッダー操作">
                        {!isRoot ? (
                            <button
                                type="button"
                                className="btn btn-lg tw-nav-btn"
                                onClick={() => navigate(-1)}
                                aria-label="前の画面に戻る"
                            >
                                <i className="bi bi-arrow-left" aria-hidden />
                            </button>
                        ) : (
                            <span />
                        )}

                        <button
                            type="button"
                            className="btn btn-lg tw-nav-btn"
                            onClick={() => navigate('/')}
                            aria-label="最初の画面に戻る"
                        >
                            <i className="bi bi-house-door" aria-hidden />
                        </button>
                    </div>
                    <div className="tw-navbar-subtitle">たべわん</div>
                    <div className="tw-navbar-title">食湾</div>
                    <div className="tw-navbar-subtitle">
                        {subtitle}
                    </div>
                </div>
            </header>

            <Routes>
                <Route path="/" element={<SelectSituationPage />} />
                <Route path="/shops/:category" element={<SelectShopPage />} />
                <Route path="/shops/:category/:shopName" element={<SelectMenuPage />} />
                <Route path="/shops/:category/:shopName/confirm" element={<OrderConfirmPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AppLayout />
        </BrowserRouter>
    )
}
