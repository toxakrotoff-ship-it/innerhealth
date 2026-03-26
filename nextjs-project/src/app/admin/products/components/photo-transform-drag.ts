import type { ProductPhotoTransform } from '@/lib/product-photo-transform'

interface ApplyDragParams {
  deltaX: number
  deltaY: number
  boxWidth: number
  boxHeight: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function applyDragToTransform(transform: ProductPhotoTransform, params: ApplyDragParams): ProductPhotoTransform {
  const { deltaX, deltaY, boxWidth, boxHeight } = params
  if (boxWidth <= 0 || boxHeight <= 0) return transform

  const nextX = transform.x + (deltaX / boxWidth) * 100
  const nextY = transform.y + (deltaY / boxHeight) * 100

  return {
    ...transform,
    x: clamp(nextX, -50, 50),
    y: clamp(nextY, -50, 50),
  }
}
