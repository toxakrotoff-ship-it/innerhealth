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
    const containerClasses = cn(
      // Базовые стили
      'w-full',
      // Центрирование
      center && 'mx-auto',
      // Адаптивные отступы
      adaptivePadding && 'px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 4xl:px-20',
      // Максимальная ширина
      maxWidth === 'full'
        ? 'max-w-full'
        : `max-w-[${adaptiveTokens.containerFixedWidths[maxWidth]}px]`,
      // Плавные переходы при изменении ширины
      'transition-all duration-300 ease-in-out',
      className
    )

    return (
      <div ref={ref} className={containerClasses} {...props}>
        {children}
      </div>
    )
  }
)

AdaptiveContainer.displayName = 'AdaptiveContainer'

/**
 * Утилитарный компонент для быстрого использования контейнеров с фиксированной шириной
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