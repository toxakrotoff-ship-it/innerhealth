import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { adaptiveTokens } from '@/lib/adaptive-tokens'

type SpacingDirection = 'vertical' | 'horizontal' | 'all' | 'top' | 'right' | 'bottom' | 'left'
type SpacingSize = 
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 56 | 64
  | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

export interface ScalableSpacingProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Направление отступа
   * - 'vertical': отступ сверху и снизу (margin-top, margin-bottom)
   * - 'horizontal': отступ слева и справа (margin-left, margin-right)
   * - 'all': отступ со всех сторон (margin)
   * - 'top', 'right', 'bottom', 'left': отступ с одной стороны
   * @default 'vertical'
   */
  direction?: SpacingDirection
  /**
   * Размер отступа (в единицах spacing scale или именованный)
   * @default 4
   */
  size?: SpacingSize
  /**
   * Включить адаптивное увеличение на больших экранах
   * @default true
   */
  adaptive?: boolean
  /**
   * Использовать padding вместо margin
   * @default false
   */
  usePadding?: boolean
  /**
   * Кастомный класс для дополнительной стилизации
   */
  className?: string
}

/**
 * Компонент для адаптивных отступов, которые масштабируются
 * на больших экранах согласно системе токенов.
 *
 * Автоматически увеличивает отступы на экранах 1920px+ и 2560px+.
 */
export const ScalableSpacing = forwardRef<HTMLDivElement, ScalableSpacingProps>(
  (
    {
      direction = 'vertical',
      size = 4,
      adaptive = true,
      usePadding = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Преобразование размера в Tailwind-класс
    const getSizeClass = (size: SpacingSize, prefix: string) => {
      if (typeof size === 'number') {
        return `${prefix}-${size}`
      }
      // Именованные размеры
      const sizeMap: Record<string, string> = {
        xs: `${prefix}-2`,
        sm: `${prefix}-4`,
        md: `${prefix}-6`,
        lg: `${prefix}-8`,
        xl: `${prefix}-12`,
        '2xl': `${prefix}-16`,
        '3xl': `${prefix}-24`,
        '4xl': `${prefix}-32`,
      }
      return sizeMap[size] || `${prefix}-4`
    }

    // Определение префикса (margin или padding)
    const prefix = usePadding ? 'p' : 'm'

    // Генерация классов для направления
    let directionClasses = ''
    switch (direction) {
      case 'vertical':
        directionClasses = `${prefix}y-${size}`
        break
      case 'horizontal':
        directionClasses = `${prefix}x-${size}`
        break
      case 'all':
        directionClasses = `${prefix}-${size}`
        break
      case 'top':
        directionClasses = `${prefix}t-${size}`
        break
      case 'right':
        directionClasses = `${prefix}r-${size}`
        break
      case 'bottom':
        directionClasses = `${prefix}b-${size}`
        break
      case 'left':
        directionClasses = `${prefix}l-${size}`
        break
    }

    // Адаптивные классы для больших экранов
    const adaptiveClasses = adaptive
      ? [
          'xl:[&]:my-6',
          '2xl:[&]:my-8',
          '3xl:[&]:my-10',
          '4xl:[&]:my-12',
        ].join(' ')
      : ''

    const spacingClasses = cn(
      directionClasses,
      adaptiveClasses,
      // Плавные переходы
      adaptive && 'transition-all duration-300 ease-in-out',
      className
    )

    return (
      <div ref={ref} className={spacingClasses} {...props}>
        {children}
      </div>
    )
  }
)

ScalableSpacing.displayName = 'ScalableSpacing'

/**
 * Предустановленные компоненты для частых случаев
 */
export const SpacingVertical = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'direction'>>(
  (props, ref) => <ScalableSpacing ref={ref} direction="vertical" {...props} />
)
SpacingVertical.displayName = 'SpacingVertical'

export const SpacingHorizontal = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'direction'>>(
  (props, ref) => <ScalableSpacing ref={ref} direction="horizontal" {...props} />
)
SpacingHorizontal.displayName = 'SpacingHorizontal'

export const SpacingTop = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'direction'>>(
  (props, ref) => <ScalableSpacing ref={ref} direction="top" {...props} />
)
SpacingTop.displayName = 'SpacingTop'

export const SpacingBottom = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'direction'>>(
  (props, ref) => <ScalableSpacing ref={ref} direction="bottom" {...props} />
)
SpacingBottom.displayName = 'SpacingBottom'

/**
 * Компоненты с фиксированными размерами
 */
export const SpacingXS = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'size'>>(
  (props, ref) => <ScalableSpacing ref={ref} size="xs" {...props} />
)
SpacingXS.displayName = 'SpacingXS'

export const SpacingSM = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'size'>>(
  (props, ref) => <ScalableSpacing ref={ref} size="sm" {...props} />
)
SpacingSM.displayName = 'SpacingSM'

export const SpacingMD = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'size'>>(
  (props, ref) => <ScalableSpacing ref={ref} size="md" {...props} />
)
SpacingMD.displayName = 'SpacingMD'

export const SpacingLG = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'size'>>(
  (props, ref) => <ScalableSpacing ref={ref} size="lg" {...props} />
)
SpacingLG.displayName = 'SpacingLG'

export const SpacingXL = forwardRef<HTMLDivElement, Omit<ScalableSpacingProps, 'size'>>(
  (props, ref) => <ScalableSpacing ref={ref} size="xl" {...props} />
)
SpacingXL.displayName = 'SpacingXL'