import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mint: { 50: '#f0fdfa', 400: '#2dd4bf', 500: '#14b8a6' },
        gold: { 50: '#fefce8', 400: '#facc15', 500: '#eab308' },
        surface: 'rgba(255, 255, 255, 0.4)',
        border: 'rgba(255, 255, 255, 0.3)',
      },
      backgroundImage: {
        'aurora-gradient': 'radial-gradient(at 0% 0%, hsla(168,100%,74%,0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(47,100%,74%,0.15) 0px, transparent 50%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
      },
    },
  },
  plugins: [],
}
export default config;