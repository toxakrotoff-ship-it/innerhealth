import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-montserrat)', 'sans-serif'],
      },
      colors: {
        'action-blue': '#3B66F5',
        'soft-background': '#F9F9F9',
        'highlight-blue': '#D9EFFF',
        'text': '#222222',
      },
      borderRadius: {
        'button': '9999px',
      },
      // Кастомные брейкпоинты для больших экранов
      screens: {
        '3xl': '1920px',   // Full HD+
        '4xl': '2560px',   // QHD/2K
        '5xl': '3840px',   // 4K UHD
        '6xl': '5120px',   // 5K и сверхбольшие экраны
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
        // Фиксированные ширины
        'screen-3xl': '1920px',
        'screen-4xl': '2560px',
        'screen-5xl': '3840px',
        'screen-6xl': '5120px',
      },
      // Дополнительные отступы для больших экранов
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '44': '11rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
        '104': '26rem',
        '112': '28rem',
        '120': '30rem',
        '128': '32rem',
      },
      // Размеры шрифтов для больших экранов
      fontSize: {
        '5xl': ['3rem', { lineHeight: '1.2' }],    // 48px
        '6xl': ['3.75rem', { lineHeight: '1.1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1.1' }],  // 72px
        '8xl': ['6rem', { lineHeight: '1' }],      // 96px
        '9xl': ['8rem', { lineHeight: '1' }],      // 128px
      },
    },
  },
  plugins: [],
};
export default config;
