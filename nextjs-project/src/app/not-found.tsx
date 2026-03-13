'use client'

import Link from 'next/link'
export default function NotFoundPage() {
  return (
    <main className="not-found-root">
      <div className="not-found-background" aria-hidden />

      <div className="not-found-layout">
        <section className="not-found-card">
          <div className="not-found-code-row">
            <span className="not-found-code-digit">4</span>
            <div className="not-found-compass-wrapper">
              <div className="not-found-compass">
                <svg
                  className="not-found-compass-svg"
                  viewBox="0 0 110 110"
                  aria-hidden="true"
                >
                  {/* Внешнее кольцо */}
                  <circle
                    cx="55"
                    cy="55"
                    r="44"
                    fill="none"
                    stroke="#00A8FF"
                    strokeWidth="4"
                  />
                  {/* Внутреннее кольцо */}
                  <circle
                    cx="55"
                    cy="55"
                    r="28"
                    fill="none"
                    stroke="#00A8FF"
                    strokeWidth="4"
                  />
                  {/* Орбитальные точки */}
                  <circle cx="55" cy="11" r="5" fill="#00A8FF" />
                  <circle cx="11" cy="55" r="5" fill="#22C55E" />
                  <circle cx="99" cy="55" r="5" fill="#F97316" />
                  <circle cx="55" cy="99" r="5" fill="#00A8FF" />
                  {/* Стрелка — анимируем только её */}
                  <g className="not-found-compass-arrow">
                    <path
                      d="M55 25 L62 55 L55 85 L48 55 Z"
                      fill="#00A8FF"
                    />
                    <path
                      d="M55 30 L60 55 L55 80 L50 55 Z"
                      fill="#ffffff"
                    />
                  </g>
                </svg>
              </div>
            </div>
            <span className="not-found-code-digit">4</span>
          </div>

          <div className="not-found-text-group not-found-text-group-primary">
            <h1 className="not-found-title">Похоже, мы свернули не туда.</h1>
          </div>

          <div className="not-found-text-group not-found-text-group-secondary">
            <p className="not-found-description">
              Страница потерялась, но путь домой — по кнопке ниже.
            </p>
          </div>

          <div className="not-found-button-wrapper">
            <Link href="/" className="not-found-button">
              <span className="relative z-10">Вернуться на главную</span>
              <span className="not-found-button-flash" aria-hidden="true" />
            </Link>
          </div>

          <div className="not-found-dots" aria-hidden="true">
            <span className="not-found-dot not-found-dot--muted" />
            <span className="not-found-dot not-found-dot--active" />
            <span className="not-found-dot not-found-dot--muted" />
          </div>
        </section>
      </div>
    </main>
  )
}

