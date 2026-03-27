/** @type {import('tailwindcss').Config} */
module.exports = {
  // Don't follow OS/device theme automatically.
  // `dark:` styles are enabled only when `.dark` class is present.
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    'text-2xs',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        display: ['Unbounded', 'sans-serif'],
      },
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
      backgroundColor: {
        'soft-background': '#F0F0F0',
      },
      borderRadius: {
        'full': '9999px',
      },
      fontSize: {
        '2xs': '10px',
        'base': '16px',
        // Размеры для больших экранов
        '5xl': ['3rem', { lineHeight: '1.2' }],    // 48px
        '6xl': ['3.75rem', { lineHeight: '1.1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1.1' }],  // 72px
        '8xl': ['6rem', { lineHeight: '1' }],      // 96px
        '9xl': ['8rem', { lineHeight: '1' }],      // 128px
      },
      // Кастомные брейкпоинты для адаптивности
      // mobile, tablet, desktop - существующие
      // xl, 2xl - стандартные Tailwind
      // 3xl, 4xl, 5xl, 6xl - новые для больших экранов
      screens: {
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
        // Стандартные Tailwind брейкпоинты (добавлены для явности)
        'xl': '1280px',
        '2xl': '1536px',
        // Новые брейкпоинты для больших экранов
        '3xl': '1920px',   // Full HD+
        '4xl': '2560px',   // QHD/2K
        '5xl': '3840px',   // 4K UHD
        '6xl': '5120px',   // 5K и сверхбольшие экраны
      },
      spacing: {
        '44': '44px',
        // Дополнительные отступы для больших экранов
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
        '104': '26rem',
        '112': '28rem',
        '120': '30rem',
        '128': '32rem',
      },
      // Максимальные ширины контейнеров
      maxWidth: {
        'container-default': 'min(90rem, 92vw)',
        'container-xl': 'min(100rem, 90vw)',
        'container-2xl': 'min(110rem, 85vw)',
        'container-3xl': 'min(120rem, 80vw)',
        'container-4xl': 'min(140rem, 75vw)',
        'container-5xl': 'min(180rem, 70vw)',
        'container-6xl': 'min(240rem, 65vw)',
        // Фиксированные ширины для особых случаев
        'screen-3xl': '1920px',
        'screen-4xl': '2560px',
        'screen-5xl': '3840px',
        'screen-6xl': '5120px',
      },
    },
  },
  plugins: [],
}
