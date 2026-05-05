/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2D5A4A',
        accent: '#E8F4FD',
        bg: '#F5F7FA',
        card: '#FFFFFF',
        text: '#333333',
        muted: '#6B7280',
        border: '#DDE3EA',
        danger: '#B83B3B',
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        base: '8px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
