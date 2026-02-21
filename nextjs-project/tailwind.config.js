/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        'action-blue': '#3B66F5',
        'soft-background': '#F9F9F9',
        'highlight-blue': '#D9EFFF',
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
        'soft-background': '#F9F9F9',
      },
      borderRadius: {
        'full': '9999px',
      },
      fontSize: {
        'base': '16px',
      },
      screens: {
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
      },
      spacing: {
        '44': '44px',
      }
    },
  },
  plugins: [],
}
