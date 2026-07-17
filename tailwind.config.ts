
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'paper': '#fdfaf3',
        'paper-dark': '#f3f0e9',
        'custom-gold': '#d4b277',
        'custom-brown': '#856d4b',
        'custom-tan': '#e8dcc8',
        'custom-dark-tan': '#a9946e',
        'custom-light-tan': '#f0deb0',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
      },
      backgroundImage: {
        'wood-pattern': "url('https://www.sketchuptextureclub.com/media/texture_m/21561.jpg')",
        'button-gradient': 'linear-gradient(135deg, #d4b277, #e8dcc8)',
      },
      boxShadow: {
        'paper': '2px 2px 5px rgba(0,0,0,0.1)',
        'header': '0 2px 10px rgba(0,0,0,0.2)',
        'text-gold': '0 0 10px rgba(212,178,119,0.3)',
      }
    },
  },
  plugins: [],
} satisfies Config
