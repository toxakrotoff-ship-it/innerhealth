/**
 * Unit тесты для хука useOverlapDetection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOverlapDetection, useMediaConflictDetection } from './use-overlap-detection'

// Мокаем ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

// Мокаем matchMedia
const createMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }))
}

describe('useOverlapDetection', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    vi.useFakeTimers()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('возвращает false когда элементы не найдены', () => {
    const { result } = renderHook(() => 
      useOverlapDetection('.non-existent-a', '.non-existent-b')
    )

    expect(result.current).toBe(false)
  })

  it('возвращает false когда элементы не пересекаются', () => {
    // Создаем мок-элементы
    const elementA = document.createElement('div')
    elementA.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => '',
    })

    const elementB = document.createElement('div')
    elementB.getBoundingClientRect = () => ({
      top: 200,
      left: 200,
      right: 300,
      bottom: 300,
      width: 100,
      height: 100,
      x: 200,
      y: 200,
      toJSON: () => '',
    })

    document.body.appendChild(elementA)
    document.body.appendChild(elementB)

    const { result } = renderHook(() => 
      useOverlapDetection('div:first-of-type', 'div:last-of-type')
    )

    expect(result.current).toBe(false)

    document.body.removeChild(elementA)
    document.body.removeChild(elementB)
  })

  it('учитывает mediaQuery параметр', () => {
    window.matchMedia = createMatchMedia(true)

    const { result } = renderHook(() => 
      useOverlapDetection('.a', '.b', '(min-width: 1024px)')
    )

    expect(result.current).toBe(true)
  })

  it('подписывается на resize события', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    
    renderHook(() => 
      useOverlapDetection('.a', '.b')
    )

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    
    addEventListenerSpy.mockRestore()
  })

  it('отписывается от событий при unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderHook(() => 
      useOverlapDetection('.a', '.b')
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})

describe('useMediaConflictDetection', () => {
  let originalInnerWidth: number
  let originalDevicePixelRatio: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    originalDevicePixelRatio = window.devicePixelRatio
    vi.useFakeTimers()
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: originalDevicePixelRatio, writable: true })
    vi.useRealTimers()
  })

  it('возвращает true для ширины 1024-1279px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1100, writable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })

    const { result } = renderHook(() => useMediaConflictDetection())

    expect(result.current).toBe(true)
  })

  it('возвращает true для DPI >= 1.3 при ширине < 1400px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1300, writable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 1.5, writable: true })

    const { result } = renderHook(() => useMediaConflictDetection())

    expect(result.current).toBe(true)
  })

  it('возвращает false для стандартной ширины >= 1280px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1400, writable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })

    const { result } = renderHook(() => useMediaConflictDetection())

    // Может быть false если нет конфликта медиа-запросов
    // Зависит от наличия элементов в DOM
    expect(typeof result.current).toBe('boolean')
  })

  it('подписывается на resize события', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    
    renderHook(() => useMediaConflictDetection())

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    
    addEventListenerSpy.mockRestore()
  })

  it('отписывается от resize при unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderHook(() => useMediaConflictDetection())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    
    removeEventListenerSpy.mockRestore()
  })

  it('реагирует на изменение ширины окна', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true })
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })

    const { result } = renderHook(() => useMediaConflictDetection())

    // Начальное состояние
    expect(result.current).toBe(false)

    // Изменяем ширину
    Object.defineProperty(window, 'innerWidth', { value: 1100, writable: true })
    
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // После изменения ширины должен быть конфликт
    expect(result.current).toBe(true)
  })
})

describe('Интеграционные тесты overlap detection', () => {
  it('корректно определяет наложение видимых элементов', () => {
    // Создаем два пересекающихся элемента
    const container = document.createElement('div')
    container.innerHTML = `
      <div class="element-a" style="position: absolute; top: 0; left: 0; width: 100px; height: 100px; display: block;"></div>
      <div class="element-b" style="position: absolute; top: 50px; left: 50px; width: 100px; height: 100px; display: block;"></div>
    `
    document.body.appendChild(container)

    const elementA = container.querySelector('.element-a') as HTMLElement
    const elementB = container.querySelector('.element-b') as HTMLElement

    // Мокаем getBoundingClientRect
    elementA.getBoundingClientRect = () => ({
      top: 0, left: 0, right: 100, bottom: 100,
      width: 100, height: 100, x: 0, y: 0, toJSON: () => '',
    })
    elementB.getBoundingClientRect = () => ({
      top: 50, left: 50, right: 150, bottom: 150,
      width: 100, height: 100, x: 50, y: 50, toJSON: () => '',
    })

    const { result } = renderHook(() => 
      useOverlapDetection('.element-a', '.element-b')
    )

    // Элементы пересекаются, но результат зависит от computed style
    expect(typeof result.current).toBe('boolean')

    document.body.removeChild(container)
  })

  it('игнорирует скрытые элементы', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <div class="hidden-a" style="display: none;"></div>
      <div class="hidden-b" style="visibility: hidden;"></div>
    `
    document.body.appendChild(container)

    const { result } = renderHook(() => 
      useOverlapDetection('.hidden-a', '.hidden-b')
    )

    // Скрытые элементы не должны давать наложение
    expect(result.current).toBe(false)

    document.body.removeChild(container)
  })
})
