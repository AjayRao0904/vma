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
        'orange': '#D75C35',        // Primary orange
        'orange-dark': '#88282E',   // Darker orange variant for gradient
        'orange-light': '#D75C35',  // Lighter orange variant (updated)
        'dark': '#000000',          // Pure black
        'background': '#000000',    // Black background
        'primary': '#D75C35',       // Primary orange
        'secondary': '#88282E',     // Secondary orange (darker variant)
        'black': '#000000',         // Pure black
      },
      fontFamily: {
        'poppins': ['var(--font-poppins)', 'sans-serif'],
        'serif': ['Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
