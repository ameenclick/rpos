/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F172A',
        surface: '#1E293B',
        border: '#334155',
        text: '#F1F0E8',
        muted: '#94A3B8',
        accent: '#F59E0B',
        danger: '#EF4444',
        success: '#10B981',
        info: '#3B82F6',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}