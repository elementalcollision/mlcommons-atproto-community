import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#CCEBD4',
          dark: '#b2d1ba',
        },
        secondary: {
          teal: '#355B65',
          blue: '#034EA2',
          'blue-light': '#4AC7EB',
        },
        dark: {
          DEFAULT: '#0F1321',
          darkest: '#11141F',
        },
        light: {
          DEFAULT: '#F7F8FA',
        },
        gray: {
          DEFAULT: '#535869',
        },
        status: {
          excellent: '#034EA2',
          'very-good': '#00926B',
          good: '#12CA98',
          fair: '#FFB024',
          poor: '#FF5C5C',
        },
      },
      fontFamily: {
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      fontSize: {
        xs: ['13px', '1.5'],
        sm: ['14px', '1.5'],
        base: ['16px', '1.5'],
        lg: ['20px', '1.4'],
        xl: ['24px', '1.3'],
        '2xl': ['36px', '1.2'],
        '3xl': ['42px', '1.1'],
      },
      spacing: {
        '20': '0.44rem',
        '30': '0.67rem',
        '40': '1rem',
        '50': '1.5rem',
        '60': '2.25rem',
        '70': '3.38rem',
        '80': '5.06rem',
      },
      boxShadow: {
        natural: '6px 6px 9px rgba(0, 0, 0, 0.2)',
        deep: '12px 12px 50px rgba(0, 0, 0, 0.4)',
        sharp: '6px 6px 0px rgba(0, 0, 0, 0.2)',
        crisp: '6px 6px 0px rgba(0, 0, 0, 1)',
      },
      borderRadius: {
        DEFAULT: '3px',
      },
      maxWidth: {
        content: '1344px',
        wide: '1680px',
      },
    },
  },
  plugins: [],
} satisfies Config;
