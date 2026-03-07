/** @type {import('tailwindcss').Config} */
module.exports = {
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
