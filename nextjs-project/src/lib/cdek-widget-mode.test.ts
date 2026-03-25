import { describe, expect, it } from 'vitest'
import { detectCdekWidgetModeFromText } from '@/lib/cdek-widget-mode'

describe('detectCdekWidgetModeFromText', () => {
  it('returns PVZ mode for pickup-related text', () => {
    expect(detectCdekWidgetModeFromText('Доставка до ПВЗ')).toBe('cdek_pvz')
    expect(detectCdekWidgetModeFromText('Выберите пункт выдачи')).toBe('cdek_pvz')
    expect(detectCdekWidgetModeFromText('САМОВЫВОЗ из офиса')).toBe('cdek_pvz')
  })

  it('returns door mode for courier-related text', () => {
    expect(detectCdekWidgetModeFromText('Курьером до двери')).toBe('cdek_door')
    expect(detectCdekWidgetModeFromText('Доставка до двери')).toBe('cdek_door')
  })

  it('returns null for unrelated text', () => {
    expect(detectCdekWidgetModeFromText('Выберите способ доставки')).toBe(null)
  })
})
