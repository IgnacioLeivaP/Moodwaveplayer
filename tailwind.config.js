/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg:             '#0a0a0a',
        panel:          '#111111',
        border:         '#2a2a2a',
        'text-primary': '#f5f5f5',
        'text-secondary':'#a0a0a0',
        accent:         '#ff4d00',
        overflow:       '#c44a3a'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier New"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
