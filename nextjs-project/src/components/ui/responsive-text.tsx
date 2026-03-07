import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { adaptiveTokens } from '@/lib/adaptive-tokens'

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

    // Адаптивные классы для больших экранов
    const adaptiveClasses = adaptive
      ? [
          'xl:text-[calc(var(--scale-xl)*1em)]',
          '2xl:text-[calc(var(--scale-2xl)*1em)]',
          '3xl:text-[calc(var(--scale-3xl)*1em)]',
          '4xl:text-[calc(var(--scale-4xl)*1em)]',
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
      adaptiveClasses,
      extraClasses,
      // Плавные переходы для адаптивных изменений
      adaptive && 'transition-all duration-300 ease-in-out',
      className
    )

    // Приведение типа ref для разных элементов (p, span, div, h1...)
    // Используем any, так как типы React не позволяют легко полиморфный ref
    return (
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

/**
 * Заголовочные компоненты
 */
export const Heading1 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} as="h1" variant="4xl" weight="bold" {...props} />
)
Heading1.displayName = 'Heading1'

export const Heading2 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} as="h2" variant="3xl" weight="semibold" {...props} />
)
Heading2.displayName = 'Heading2'

export const Heading3 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} as="h3" variant="2xl" weight="semibold" {...props} />
)
Heading3.displayName = 'Heading3'

export const Heading4 = forwardRef<HTMLHeadingElement, Omit<ResponsiveTextProps, 'as' | 'variant'>>(
  (props, ref) => <ResponsiveText ref={ref} as="h4" variant="xl" weight="medium" {...props} />
)
Heading4.displayName = 'Heading4'