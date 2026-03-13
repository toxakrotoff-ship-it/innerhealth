import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { adaptiveTokens, getScaledSize } from '@/lib/adaptive-tokens'

type TextVariant =
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | '8xl'
  | '9xl'

type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
type TextAlign = 'left' | 'center' | 'right' | 'justify'
type TextColor = keyof typeof adaptiveTokens.colors.text | 'inherit' | 'current'
type FontFamily = 'sans' | 'display' | 'script'

export interface ResponsiveTextProps extends HTMLAttributes<HTMLParagraphElement> {
  /**
   * HTML-тег для рендеринга
   * @default 'p'
   */
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  /**
   * Вариант размера текста (соответствует Tailwind fontSize)
   * @default 'base'
   */
  variant?: TextVariant
  /**
   * Вес шрифта
   * @default 'normal'
   */
  weight?: TextWeight
  /**
   * Выравнивание текста
   * @default 'left'
   */
  align?: TextAlign
  /**
   * Цвет текста
   * @default 'primary'
   */
  color?: TextColor
  /**
   * Семейство шрифтов
   * @default 'sans'
   */
  fontFamily?: FontFamily
  /**
   * Включить адаптивное масштабирование на больших экранах
   * @default true
   */
  adaptive?: boolean
  /**
   * Максимальное количество строк (обрезание многоточием)
   */
  lineClamp?: number
  /**
   * Отключить перенос слов
   * @default false
   */
  noWrap?: boolean
  /**
   * Верхний регистр
   * @default false
   */
  uppercase?: boolean
  /**
   * Подчеркивание
   * @default false
   */
  underline?: boolean
  /**
   * Курсив
   * @default false
   */
  italic?: boolean
  /**
   * Межбуквенный интервал (tracking)
   */
  tracking?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest'
  /**
   * Высота строки (leading)
   */
  leading?: 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose'
  /**
   * Кастомный класс для дополнительной стилизации
   */
  className?: string
}

/**
 * Адаптивный текстовый компонент, который масштабирует размер шрифта
 * и другие типографические свойства на больших экранах.
 *
 * Поддерживает экраны до 5K+ (5120px / 6xl брейкпоинт).
 * Использует коэффициенты масштабирования из системы токенов.
 */
export const ResponsiveText = forwardRef<HTMLParagraphElement, ResponsiveTextProps>(
  (
    {
      as: Component = 'p',
      variant = 'base',
      weight = 'normal',
      align = 'left',
      color = 'primary',
      fontFamily = 'sans',
      adaptive = true,
      lineClamp,
      noWrap = false,
      uppercase = false,
      underline = false,
      italic = false,
      tracking,
      leading,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Базовые классы для размера
    const sizeClasses = `text-${variant}`

    // Классы для веса
    const weightClasses = {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      extrabold: 'font-extrabold',
    }[weight]

    // Классы для выравнивания
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    }[align]

    // Классы для цвета
    const colorClasses = color === 'inherit' || color === 'current'
      ? `text-${color}`
      : color === 'primary'
        ? 'text-text'
        : color === 'secondary'
          ? 'text-gray-600'
          : ''

    // Классы для семейства шрифтов
    const fontFamilyClasses = {
      sans: 'font-sans',
      display: 'font-display',
      script: 'font-script',
    }[fontFamily]

    // Адаптивные классы для больших экранов с поддержкой 5xl и 6xl
    const adaptiveClasses = adaptive
      ? [
          'xl:text-[calc(var(--scale-xl)*1em)]',
          '2xl:text-[calc(var(--scale-2xl)*1em)]',
          '3xl:text-[calc(var(--scale-3xl)*1em)]',
          '4xl:text-[calc(var(--scale-4xl)*1em)]',
          '5xl:text-[calc(var(--scale-5xl)*1em)]',
          '6xl:text-[calc(var(--scale-6xl)*1em)]',
        ].join(' ')
      : ''

    // Дополнительные классы
    const extraClasses = cn(
      lineClamp && `line-clamp-${lineClamp}`,
      noWrap && 'whitespace-nowrap',
      uppercase && 'uppercase',
      underline && 'underline',
      italic && 'italic',
      tracking && `tracking-${tracking}`,
      leading && `leading-${leading}`
    )

    const textClasses = cn(
      sizeClasses,
      weightClasses,
      alignClasses,
      colorClasses,
      fontFamilyClasses,
      adaptiveClasses,
      extraClasses,
      // Плавные переходы для адаптивных изменений
      adaptive && 'transition-all duration-300 ease-in-out',
      className
    )

    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- полиморфный ref для разных HTML-элементов
      <Component ref={ref as any} className={textClasses} {...props}>
        {children}
      </Component>
    )
  }
)

ResponsiveText.displayName = 'ResponsiveText'

/**
 * Предустановленные компоненты для частых случаев
 */
export const TextXS = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="xs" {...props} />
)
TextXS.displayName = 'TextXS'

export const TextSM = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="sm" {...props} />
)
TextSM.displayName = 'TextSM'

export const TextBase = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="base" {...props} />
)
TextBase.displayName = 'TextBase'

export const TextLG = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="lg" {...props} />
)
TextLG.displayName = 'TextLG'

export const TextXL = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="xl" {...props} />
)
TextXL.displayName = 'TextXL'

export const Text2XL = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="2xl" {...props} />
)
Text2XL.displayName = 'Text2XL'

export const Text3XL = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="3xl" {...props} />
)
Text3XL.displayName = 'Text3XL'

export const Text4XL = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="4xl" {...props} />
)
Text4XL.displayName = 'Text4XL'

export const Text5XL = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="5xl" {...props} />
)
Text5XL.displayName = 'Text5XL'

export const Text6XL = forwardRef<HTMLParagraphElement, Omit<ResponsiveTextProps, 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} variant="6xl" {...props} />
)
Text6XL.displayName = 'Text6XL'

/**
 * Заголовочные компоненты.
 *
 * Для них используем Tailwind‑брейкпоинты вместо общих адаптивных токенов,
 * чтобы на ≥1280px заголовки не становились меньше, а на более узких
 * экранах плавно уменьшались.
 */
export const Heading1 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  ({ className, ...props }, ref) => (
    <ResponsiveText
      ref={ref}
      as="h1"
      variant="3xl"
      weight="bold"
      fontFamily="display"
      adaptive={false}
      className={cn('sm:text-4xl', className)}
      {...props}
    />
  )
)
Heading1.displayName = 'Heading1'

export const Heading2 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  ({ className, ...props }, ref) => (
    <ResponsiveText
      ref={ref}
      as="h2"
      variant="3xl"
      weight="semibold"
      fontFamily="display"
      adaptive={false}
      className={cn('sm:text-4xl', className)}
      {...props}
    />
  )
)
Heading2.displayName = 'Heading2'

export const Heading3 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} as="h3" variant="2xl" weight="semibold" fontFamily="display" {...props} />
)
Heading3.displayName = 'Heading3'

export const Heading4 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} as="h4" variant="xl" weight="medium" fontFamily="display" {...props} />
)
Heading4.displayName = 'Heading4'

/**
 * Хук для получения адаптивного размера шрифта
 */
export function useAdaptiveFontSize(
  baseSize: number,
  breakpoint: keyof typeof adaptiveTokens.scaleFactors = 'base'
) {
  return getScaledSize(baseSize, breakpoint)
}

export default ResponsiveText
