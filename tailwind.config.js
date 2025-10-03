/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'orange': '#D75C35',
        'orange-light': '#FFE5CF',
        'dark': '#1F1F1F',
      },
      fontFamily: {
        'poppins': ['var(--font-poppins)', 'sans-serif'],
        'serif': ['Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
