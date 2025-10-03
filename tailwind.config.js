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
        'orange-light': '#FF8A65',  // Lighter orange variant
        'dark': '#000000',          // Pure black
        'background': '#000000',    // Black background
        'primary': '#D75C35',       // Primary orange
        'secondary': '#FF8A65',     // Secondary orange
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
