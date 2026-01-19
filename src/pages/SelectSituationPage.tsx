import { useNavigate } from 'react-router-dom'

import { CATEGORIES } from '../data/categories'

export default function SelectSituationPage() {
    const navigate = useNavigate()

    return (
        <main className="container py-4">
            <div className="row g-3">
                {CATEGORIES.map((category) => (
                    <div className="col-6" key={category.key}>
                        <button
                            type="button"
                            className="tw-option-card w-100"
                            onClick={() => navigate(`/shops/${encodeURIComponent(category.key)}`)}
                        >
                            <div className="d-flex flex-column align-items-center text-center gap-2">
                                <div className="tw-icon-circle" aria-hidden>
                                    {category.emoji}
                                </div>
                                <div className="fw-bold">{category.key}</div>
                            </div>
                        </button>
                    </div>
                ))}
            </div>
        </main>
    )
}
