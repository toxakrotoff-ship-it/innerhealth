'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * Хук для обнаружения наложения (пересечения) двух элементов.
 * Возвращает true, если элементы пересекаются или оба видны одновременно.
 * Также предоставляет fallback на основе matchMedia для обнаружения конфликтов медиа-запросов.
 */
export function useOverlapDetection(
  /** Селектор первого элемента (десктопное меню) */
  selectorA: string,
  /** Селектор второго элемента (мобильное меню) */
  selectorB: string,
  /** Дополнительная проверка через matchMedia для обнаружения конфликтов медиа-запросов */
  mediaQuery?: string
): boolean {
  const [overlap, setOverlap] = useState(false)
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    const elementA = document.querySelector(selectorA)
    const elementB = document.querySelector(selectorB)

    if (!elementA || !elementB) {
      // Если элементы не найдены, считаем что наложения нет
      setOverlap(false)
      return
    }

    const checkOverlap = () => {
      const rectA = elementA.getBoundingClientRect()
      const rectB = elementB.getBoundingClientRect()

      const isOverlapping = !(
        rectA.right < rectB.left ||
        rectA.left > rectB.right ||
        rectA.bottom < rectB.top ||
        rectA.top > rectB.bottom
      )

      // Также проверяем видимость элементов
      const styleA = window.getComputedStyle(elementA)
      const styleB = window.getComputedStyle(elementB)
      const isVisibleA = styleA.display !== 'none' && styleA.visibility !== 'hidden' && styleA.opacity !== '0'
      const isVisibleB = styleB.display !== 'none' && styleB.visibility !== 'hidden' && styleB.opacity !== '0'

      // Наложение считается, если оба видны и пересекаются, или если оба видны одновременно (даже без пересечения)
      const bothVisible = isVisibleA && isVisibleB
      setOverlap(bothVisible && isOverlapping)
    }

    // Проверка при изменении размеров и прокрутке
    const handleResize = () => {
      checkOverlap()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, { passive: true })

    // Используем ResizeObserver для отслеживания изменений размеров элементов
    observerRef.current = new ResizeObserver(checkOverlap)
    observerRef.current.observe(elementA)
    observerRef.current.observe(elementB)

    // Первоначальная проверка
    checkOverlap()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [selectorA, selectorB])

  // Дополнительная проверка через matchMedia (если предоставлен mediaQuery)
  const [mediaMatches, setMediaMatches] = useState(false)
  useEffect(() => {
    if (!mediaQuery) return

    const media = window.matchMedia(mediaQuery)
    const handleChange = (e: MediaQueryListEvent) => setMediaMatches(e.matches)
    setMediaMatches(media.matches)

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [mediaQuery])

  // Итоговое состояние: наложение обнаружено либо через геометрию, либо через медиа-запрос
  return overlap || mediaMatches
}

/**
 * Упрощенный хук для обнаружения конфликта медиа-запросов между десктопным и мобильным меню.
 * Возвращает true, если оба меню потенциально видны одновременно (например, при ширине экрана между breakpoints).
 */
export function useMediaConflictDetection(): boolean {
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    const checkConflict = () => {
      // Проверка на проблемные диапазоны ширины экрана
      const width = window.innerWidth
      const dpr = window.devicePixelRatio || 1

      // Диапазон 1024-1279px - показываем мобильное меню
      if (width >= 1024 && width < 1280) {
        setConflict(true)
        return
      }

      // DPI масштабирование 133-150% при ширине до 1400px
      if (dpr >= 1.3 && width < 1400) {
        setConflict(true)
        return
      }

      // Стандартная проверка конфликта медиа-запросов
      const desktopMenu = document.querySelector('nav.hidden.xl\\:flex') // Десктопное меню (скрыто на мобильных)
      const mobileMenu = document.querySelector('.xl\\:hidden') // Контейнер мобильного меню

      if (!desktopMenu || !mobileMenu) {
        setConflict(false)
        return
      }

      const styleDesktop = window.getComputedStyle(desktopMenu)
      const styleMobile = window.getComputedStyle(mobileMenu)

      // Если оба элемента имеют display != 'none', значит они видны одновременно
      const desktopVisible = styleDesktop.display !== 'none'
      const mobileVisible = styleMobile.display !== 'none'

      setConflict(desktopVisible && mobileVisible)
    }

    checkConflict()
    window.addEventListener('resize', checkConflict)
    return () => window.removeEventListener('resize', checkConflict)
  }, [])

  return conflict
}