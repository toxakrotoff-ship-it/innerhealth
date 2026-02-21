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
    },
  },
  plugins: [],
};
export default config;