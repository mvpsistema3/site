/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sesh: {
          black: '#000000',
          white: '#FFFFFF',
          cyan: '#00B4BD',
          gray: '#F2F2F2',
          darkgray: '#333333',
          red: '#DC3545',
          warning: '#FFA500',
        }
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      }
    }
  },
  plugins: [],
}
