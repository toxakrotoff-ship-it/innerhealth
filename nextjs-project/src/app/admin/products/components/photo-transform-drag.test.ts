import { describe, expect, it } from 'vitest'
import { applyDragToTransform } from '@/app/admin/products/components/photo-transform-drag'

describe('applyDragToTransform', () => {
  it('maps drag delta to percent offsets', () => {
    const result = applyDragToTransform(
      { x: 0, y: 0, zoom: 1, fitMode: 'contain' },
      { deltaX: 50, deltaY: -20, boxWidth: 200, boxHeight: 400 }
    )

    expect(result.x).toBe(25)
    expect(result.y).toBe(-5)
  })

  it('clamps offsets to allowed range', () => {
    const result = applyDragToTransform(
      { x: 45, y: -45, zoom: 1, fitMode: 'cover' },
      { deltaX: 50, deltaY: -50, boxWidth: 100, boxHeight: 100 }
    )

    expect(result.x).toBe(50)
    expect(result.y).toBe(-50)
  })
})
