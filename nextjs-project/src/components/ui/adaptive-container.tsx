import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { adaptiveTokens } from '@/lib/adaptive-tokens'

export interface AdaptiveContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Максимальная ширина контейнера.
   * - 'default' (1440px)
   * - 'xl' (1440px)
   * - '2xl' (1600px)
   * - '3xl' (1920px)
   * - '4xl' (2240px)
   * - '5xl' (2880px) - для 4K экранов (3840px)
   * - '6xl' (3840px) - для 5K экранов (5120px)
   * - 'full' (100% ширины)
   */
  maxWidth?: keyof typeof adaptiveTokens.containerFixedWidths | 'full'
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
    // Получаем фиксированную ширину из токенов
    const maxWidthValue = maxWidth === 'full' 
      ? '100%' 
      : `${adaptiveTokens.containerFixedWidths[maxWidth]}px`

    const containerClasses = cn(
      // Базовые стили
      'w-full',
      // Центрирование
      center && 'mx-auto',
      // Адаптивные отступы с поддержкой 5xl и 6xl
      adaptivePadding && [
        'px-4 sm:px-6 lg:px-8',
        'xl:px-10 2xl:px-12 3xl:px-16 4xl:px-20',
        '5xl:px-24 6xl:px-32',
      ],
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
 * Утилитарные компоненты для быстрого использования контейнеров с фиксированной шириной
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
export function useContainerWidth(breakpoint: keyof typeof adaptiveTokens.containerFixedWidths = 'default') {
  return adaptiveTokens.containerFixedWidths[breakpoint]
}

export default AdaptiveContainer
