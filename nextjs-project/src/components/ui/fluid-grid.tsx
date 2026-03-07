import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { adaptiveTokens } from '@/lib/adaptive-tokens'

export interface FluidGridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Количество колонок по умолчанию (на мобильных)
   * @default 1
   */
  cols?: number
  /**
   * Количество колонок на планшетах (>= 768px)
   */
  colsTablet?: number
  /**
   * Количество колонок на десктопах (>= 1024px)
   */
  colsDesktop?: number
  /**
   * Количество колонок на больших экранах (>= 1280px)
   */
  colsXl?: number
  /**
   * Количество колонок на экранах 2xl (>= 1536px)
   */
  cols2xl?: number
  /**
   * Количество колонок на экранах 3xl (>= 1920px)
   */
  cols3xl?: number
  /**
   * Количество колонок на экранах 4xl (>= 2560px)
   */
  cols4xl?: number
  /**
   * Промежуток между элементами (в пикселях или Tailwind-классе)
   * @default 4
   */
  gap?: number | string
  /**
   * Адаптивный промежуток: увеличивается на больших экранах
   * @default true
   */
  adaptiveGap?: boolean
  /**
   * Выравнивание элементов по вертикали
   */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /**
   * Выравнивание элементов по горизонтали
   */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  /**
   * Автоматическое заполнение строк (auto-fit)
   * @default false
   */
  autoFit?: boolean
  /**
   * Минимальная ширина элемента при auto-fit (в пикселях)
   * @default 250
   */
  minItemWidth?: number
  /**
   * Кастомный класс для дополнительной стилизации
   */
  className?: string
}

/**
 * Адаптивная сетка, которая плавно меняет количество колонок и промежутки
 * в зависимости от брейкпоинтов больших экранов.
 *
 * Использует CSS Grid с медиа-запросами, основанными на системе токенов.
 */
export const FluidGrid = forwardRef<HTMLDivElement, FluidGridProps>(
  (
    {
      cols = 1,
      colsTablet,
      colsDesktop,
      colsXl,
      cols2xl,
      cols3xl,
      cols4xl,
      gap = 4,
      adaptiveGap = true,
      align = 'stretch',
      justify = 'start',
      autoFit = false,
      minItemWidth = 250,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Генерация классов для колонок
    const gridColsClasses = cn(
      // Базовое количество колонок
      `grid-cols-${cols}`,
      // Планшет
      colsTablet && `md:grid-cols-${colsTablet}`,
      // Десктоп
      colsDesktop && `lg:grid-cols-${colsDesktop}`,
      // XL
      colsXl && `xl:grid-cols-${colsXl}`,
      // 2XL
      cols2xl && `2xl:grid-cols-${cols2xl}`,
      // 3XL
      cols3xl && `3xl:grid-cols-${cols3xl}`,
      // 4XL
      cols4xl && `4xl:grid-cols-${cols4xl}`,
      // Auto-fit режим
      autoFit && `grid-cols-[repeat(auto-fit,minmax(${minItemWidth}px,1fr))]`
    )

    // Генерация классов для промежутков
    const gapValue = typeof gap === 'number' ? `${gap * 0.25}rem` : gap
    const gapClasses = cn(
      // Базовый промежуток
      `gap-${gap}`,
      // Адаптивные увеличения промежутков на больших экранах
      adaptiveGap && [
        'xl:gap-6',
        '2xl:gap-8',
        '3xl:gap-10',
        '4xl:gap-12',
      ]
    )

    // Классы выравнивания
    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    }[align]

    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    }[justify]

    const gridClasses = cn(
      'grid',
      !autoFit && gridColsClasses,
      gapClasses,
      alignClasses,
      justifyClasses,
      // Плавные переходы
      'transition-all duration-300 ease-in-out',
      className
    )

    // Инлайн стили для кастомного gap (если передан number)
    const style = typeof gap === 'number' ? { gap: `${gap}px` } : undefined

    return (
      <div ref={ref} className={gridClasses} style={style} {...props}>
        {children}
      </div>
    )
  }
)

FluidGrid.displayName = 'FluidGrid'

/**
 * Предустановленные конфигурации сетки для частых случаев
 */
export const GridAutoFit = forwardRef<HTMLDivElement, Omit<FluidGridProps, 'autoFit'>>(
  (props, ref) => <FluidGrid ref={ref} autoFit {...props} />
)
GridAutoFit.displayName = 'GridAutoFit'

export const GridResponsive = forwardRef<HTMLDivElement, Omit<FluidGridProps, 'cols' | 'colsTablet' | 'colsDesktop' | 'colsXl' | 'cols2xl' | 'cols3xl' | 'cols4xl'>>(
  (props, ref) => (
    <FluidGrid
      ref={ref}
      cols={1}
      colsTablet={2}
      colsDesktop={3}
      colsXl={4}
      cols2xl={5}
      cols3xl={6}
      cols4xl={8}
      {...props}
    />
  )
)
GridResponsive.displayName = 'GridResponsive'