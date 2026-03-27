import type { Config } from 'tailwindcss'

const config: Config = {
  // Don't follow OS/device theme automatically.
  // `dark:` styles are enabled only when `.dark` class is present.
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'action-blue': '#88AFCB',
        'soft-background': '#F0F0F0',
        'highlight-blue': '#E6F3FD',
        'text': '#222222',
        'destructive': '#EF4444',
        'success': '#10B981',
        'warning': '#F59E0B',
        'gray': {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Montserrat', 'sans-serif'],
        display: ['var(--font-unbounded)', 'Unbounded', 'sans-serif'],
      },
      borderRadius: {
        'full': '9999px',
      },
      fontSize: {
        '2xs': '10px',
        '16': '16px',
      },
      spacing: {
        '44': '44px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
      },
      // Адаптивные брейкпоинты для больших экранов
      screens: {
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        '4xl': '2560px',
      },
      // Адаптивные контейнеры
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
          '3xl': '8rem',
          '4xl': '10rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
          '3xl': '1920px',
          '4xl': '2560px',
        },
      },
    },
  },
  plugins: [],
}
export default config