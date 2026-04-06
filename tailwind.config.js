/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.tsx",
    "./*.ts",
    "./components/**/*.{tsx,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: {
          850: '#202023',
          950: '#09090b',
        }
      }
    }
  },
  plugins: [],
}
