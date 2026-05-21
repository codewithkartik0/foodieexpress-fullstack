/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5ed',
          100: '#ffe7d2',
          200: '#ffcaa3',
          300: '#ffa66a',
          400: '#fd7c34',
          500: '#f15a14',
          600: '#e2440b',
          700: '#bb320c',
          800: '#952811',
          900: '#782312',
          950: '#410e06',
        },
        ink: {
          50: '#f7f7f8',
          100: '#eeeff1',
          200: '#d8dade',
          300: '#b6bac1',
          400: '#8e939d',
          500: '#717682',
          600: '#5b606a',
          700: '#494d56',
          800: '#3c4047',
          900: '#34373d',
          950: '#1f2125',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        elevated: '0 10px 30px -10px rgb(0 0 0 / 0.15)',
      },
    },
  },
  plugins: [],
};
