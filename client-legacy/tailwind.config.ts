import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3fa',
          100: '#e1e7f5',
          200: '#c3cfeb',
          300: '#a5b7e0',
          400: '#879fd6',
          500: '#6987cc',
          600: '#4a5fa2',
          700: '#354778',
          800: '#202f4e',
          900: '#0b1824',
        },
        brand: {
          primary: '#354778',
          secondary: '#4a5fa2',
          accent: '#87ceeb',
        }
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '28px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
        '4xl': ['36px', '40px'],
        '5xl': ['48px', '52px'],
      },
      spacing: {
        'gutter': '24px',
      }
    },
  },
  plugins: [],
}

export default config
