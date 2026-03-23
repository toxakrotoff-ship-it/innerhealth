'use client'

import { useEffect, useState } from 'react'

const PRELOADER_SEEN_KEY = 'innerhealth-preloader-seen'
const PRELOADER_24H_MS = 24 * 60 * 60 * 1000
export const TOTAL_DURATION_MS = 4200

interface PreloaderSceneProps {
  /** В режиме loop оверлей не исчезает — для тестовой страницы с перезапуском по key */
  loop?: boolean
  /** Внутри контейнера (position: absolute), а не на весь экран */
  inline?: boolean
}

export function PreloaderScene({ loop = false, inline = false }: PreloaderSceneProps) {
  const overlayClass = [
    'preloader-overlay',
    loop && 'preloader-overlay--loop',
    inline && 'preloader-overlay--inline',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={overlayClass}
      aria-hidden
      style={{
        ['--preloader-duration' as string]: `${TOTAL_DURATION_MS}ms`,
        ['--preloader-fade-start' as string]: '3.7s',
      }}
    >
      <style>{`
        .preloader-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #e8e9eb;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: preloader-fade-out 0.5s ease-out var(--preloader-fade-start) forwards;
          pointer-events: none;
        }
        .preloader-overlay--loop {
          animation: none;
        }
        .preloader-overlay--inline {
          position: absolute;
          z-index: 1;
        }
        .preloader-bottle-wrap {
          position: relative;
          width: 120px;
          height: 220px;
          animation:
            preloader-bottle-appear 0.45s ease-out 0s forwards,
            preloader-bottle-fly 1s ease-in 2.2s forwards;
          transform-origin: center center;
        }
        .preloader-bottle {
          width: 120px;
          height: 200px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .preloader-cap {
          width: 44px;
          height: 24px;
          background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 50%, #ddd 100%);
          border-radius: 4px 4px 0 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: relative;
          z-index: 2;
          animation: preloader-cap-sequence 4.2s cubic-bezier(0.45, 0, 0.55, 1) 0s forwards;
        }
        .preloader-cap-ribs {
          position: absolute;
          inset: 2px 4px;
          background: repeating-linear-gradient(
            90deg,
            transparent 0,
            transparent 3px,
            rgba(0,0,0,0.06) 3px,
            rgba(0,0,0,0.06) 5px
          );
          background-size: 5px 100%;
          background-position: 0 0;
          border-radius: 2px;
          animation: preloader-conveyor 4.2s linear 0s forwards;
        }
        .preloader-neck {
          width: 44px;
          height: 8px;
          background: linear-gradient(90deg,
            rgba(0,0,0,0.05) 0%,
            transparent 20%,
            #f5f5f5 50%,
            transparent 80%,
            rgba(0,0,0,0.05) 100%
          );
          border-radius: 2px 2px 0 0;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -1px 0 rgba(0,0,0,0.06),
            inset 1px 0 2px rgba(0,0,0,0.03),
            inset -1px 0 2px rgba(0,0,0,0.03);
          flex-shrink: 0;
        }
        .preloader-body {
          width: 100px;
          height: 152px;
          background:
            linear-gradient(90deg,
              rgba(0,0,0,0.1) 0%,
              rgba(0,0,0,0.05) 8%,
              transparent 18%,
              rgba(255,255,255,0.85) 48%,
              rgba(255,255,255,0.85) 52%,
              transparent 82%,
              rgba(0,0,0,0.05) 92%,
              rgba(0,0,0,0.1) 100%
            ),
            linear-gradient(180deg, #fff 0%, #f9f9f9 100%);
          border-radius: 8px 8px 2px 2px;
          box-shadow:
            inset 0 0 0 1px rgba(0,0,0,0.05),
            inset 6px 0 12px rgba(0,0,0,0.07),
            inset -6px 0 12px rgba(0,0,0,0.07),
            0 4px 14px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        .preloader-label {
          position: absolute;
          inset: 8px 6px 12px;
          background: #fafafa;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07);
          border: 1px solid rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 10px 8px;
          font-family: var(--font-montserrat), sans-serif;
        }
        .preloader-brand {
          font-size: 8px;
          font-weight: 600;
          color: #222;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }
        .preloader-product {
          font-size: 11px;
          font-weight: 700;
          color: #222;
          line-height: 1.15;
          margin-bottom: 6px;
        }
        .preloader-wave {
          width: 100%;
          height: 22px;
          background:
            linear-gradient(92deg, transparent 38%, rgba(70, 150, 195, 0.55) 42%, rgba(70, 150, 195, 0.5) 46%, transparent 50%),
            linear-gradient(88deg, transparent 44%, rgba(120, 185, 225, 0.45) 47%, rgba(120, 185, 225, 0.4) 51%, transparent 55%),
            linear-gradient(94deg, transparent 42%, rgba(55, 140, 180, 0.5) 45%, transparent 49%),
            linear-gradient(90deg, transparent 48%, rgba(95, 170, 210, 0.4) 51%, transparent 54%),
            linear-gradient(96deg, transparent 40%, rgba(130, 190, 228, 0.35) 44%, transparent 48%),
            linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.06) 100%),
            linear-gradient(90deg, transparent 0%, rgba(88, 166, 203, 0.25) 15%, rgba(88, 166, 203, 0.5) 50%, rgba(88, 166, 203, 0.25) 85%, transparent 100%);
          border-radius: 4px 4px 0 0;
          margin-top: auto;
        }
        .preloader-capsules {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }
        .preloader-capsule {
          position: absolute;
          width: 14px;
          height: 8px;
          left: 50%;
          margin-left: -7px;
          background: linear-gradient(135deg, #a8d4e8 0%, #7eb8d4 100%);
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
          opacity: 0;
          animation: preloader-capsule-fall var(--preloader-capsule-duration) ease-in var(--preloader-capsule-start) forwards;
        }
        /* Лента только в начальной точке: → откручивание (0–0.5s), ← закручивание (после возврата крышки) */
        @keyframes preloader-conveyor {
          0% { background-position: 0 0; }
          11.9% { background-position: 30px 0; }
          47.6% { background-position: 30px 0; }
          59.5% { background-position: 0 0; }
          100% { background-position: 0 0; }
        }
        /* Открутили → микропауза → плавно отодвинули; плавно вернули → закрутили. Без зигзага, мягкий ease-in-out. */
        @keyframes preloader-cap-sequence {
          0% { transform: translate(0, 0); }
          11.9% { transform: translate(0, 0); }
          14.3% { transform: translate(0, 0); }
          26.2% { transform: translate(55px, -18px); }
          39.3% { transform: translate(55px, -18px); }
          47.6% { transform: translate(0, 0); }
          100% { transform: translate(0, 0); }
        }
        @keyframes preloader-capsule-fall {
          0% {
            opacity: 0;
            transform: translateY(-60px) translateX(var(--capsule-drift, 0));
          }
          8% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(100px) translateX(var(--capsule-drift, 0));
          }
        }
        @keyframes preloader-bottle-appear {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes preloader-bottle-fly {
          0% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateX(120vw) translateY(-20px) scale(0.4);
            opacity: 0.3;
          }
        }
        @keyframes preloader-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; visibility: hidden; }
        }
      `}</style>

      <div className="preloader-bottle-wrap">
        <div className="preloader-capsules" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="preloader-capsule"
              style={{
                ['--preloader-capsule-start' as string]: `${1.02 + i * 0.07}s`,
                ['--preloader-capsule-duration' as string]: '0.7s',
                ['--capsule-drift' as string]: `${(i % 3 - 1) * 10}px`,
              }}
            />
          ))}
        </div>
        <div className="preloader-bottle">
          <div className="preloader-cap">
            <div className="preloader-cap-ribs" />
          </div>
          <div className="preloader-neck" aria-hidden />
          <div className="preloader-body">
            <div className="preloader-label">
              <span className="preloader-brand">INNER HEALTH</span>
              <span className="preloader-product">COLLAGEN TYPE II</span>
              <div className="preloader-wave" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PRELOADER_ACTIVE_CLASS = 'preloader-active'

export function Preloader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const seenRaw = localStorage.getItem(PRELOADER_SEEN_KEY)
    const seenAt = seenRaw ? Number.parseInt(seenRaw, 10) : 0
    const isSeenRecently = Boolean(seenAt && Date.now() - seenAt < PRELOADER_24H_MS)

    if (isSeenRecently || document.documentElement.dataset.preloaderSkip === '1') {
      document.documentElement.dataset.preloaderSkip = '1'
      document.documentElement.classList.add('preloader-skip')
      setVisible(false)
      return
    }

    localStorage.setItem(PRELOADER_SEEN_KEY, String(Date.now()))

    const timeoutId = window.setTimeout(() => {
      setVisible(false)
    }, TOTAL_DURATION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    const isSkipped = document.documentElement.dataset.preloaderSkip === '1'
    if (visible && !isSkipped) {
      document.documentElement.classList.add(PRELOADER_ACTIVE_CLASS)
      return () => document.documentElement.classList.remove(PRELOADER_ACTIVE_CLASS)
    }
    document.documentElement.classList.remove(PRELOADER_ACTIVE_CLASS)
  }, [visible])

  if (!visible) return null

  return <PreloaderScene loop={false} />
}
