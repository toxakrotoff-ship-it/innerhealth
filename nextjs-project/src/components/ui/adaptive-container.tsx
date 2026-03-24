import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { adaptiveTokens } from '@/lib/adaptive-tokens'

export interface AdaptiveContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Максимальная ширина контейнера.
   * Значения берутся из процентных токенов `containerWidths`
   * для сохранения стабильных полей по бокам на разных DPI/экранах.
   * - 'full' (100% ширины)
   */
  maxWidth?: keyof typeof adaptiveTokens.containerWidths | 'full'
  /**
   * Включить центрирование контейнера
   * @default true
   */
  center?: boolean
  /**
   * Включить адаптивные отступы (padding) в зависимости от брейкпоинта
   * @default true
   */
  adaptivePadding?: boolean
  /**
   * Кастомный класс для дополнительной стилизации
   */
  className?: string
}

/**
 * Адаптивный контейнер, который масштабирует свою максимальную ширину
 * в зависимости от брейкпоинтов больших экранов.
 *
 * Поддерживает экраны до 5K+ (5120px / 6xl брейкпоинт).
 * Использует CSS-переменные из системы токенов для плавного перехода.
 */
export const AdaptiveContainer = forwardRef<HTMLDivElement, AdaptiveContainerProps>(
  (
    {
      maxWidth = 'default',
      center = true,
      adaptivePadding = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const maxWidthValue =
      maxWidth === 'full' ? '100%' : adaptiveTokens.containerWidths[maxWidth]

    const containerClasses = cn(
      // Базовые стили
      'w-full',
      // Центрирование
      center && 'mx-auto',
      // Процентные внутренние отступы сохраняют единый ритм при изменении DPI.
      adaptivePadding && 'px-[max(12px,2vw)]',
      // Максимальная ширина через inline-стиль для корректной работы
      className
    )

    return (
      <div 
        ref={ref} 
        className={containerClasses} 
        style={{ maxWidth: maxWidthValue }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

AdaptiveContainer.displayName = 'AdaptiveContainer'

/**
 * Утилитарные компоненты для быстрого использования контейнеров
 */

export const ContainerXL = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="xl" {...props} />
)
ContainerXL.displayName = 'ContainerXL'

export const Container2XL = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="2xl" {...props} />
)
Container2XL.displayName = 'Container2XL'

export const Container3XL = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="3xl" {...props} />
)
Container3XL.displayName = 'Container3XL'

export const Container4XL = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="4xl" {...props} />
)
Container4XL.displayName = 'Container4XL'

export const Container5XL = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="5xl" {...props} />
)
Container5XL.displayName = 'Container5XL'

export const Container6XL = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="6xl" {...props} />
)
Container6XL.displayName = 'Container6XL'

/**
 * Контейнер с полной шириной
 */
export const ContainerFull = forwardRef<HTMLDivElement, Omit<AdaptiveContainerProps, 'maxWidth'>>(
  (props, ref) => <AdaptiveContainer ref={ref} maxWidth="full" {...props} />
)
ContainerFull.displayName = 'ContainerFull'

/**
 * Хук для получения адаптивной ширины контейнера
 */
export function useContainerWidth(breakpoint: keyof typeof adaptiveTokens.containerWidths = 'default') {
  return adaptiveTokens.containerWidths[breakpoint]
}

export default AdaptiveContainer
