/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ember: {
          primary: '#C2410C',
          'primary-hover': '#9A3412',
          accent: '#F59E0B',
          'accent-hover': '#D97706',
          neutral: '#78716C',
          bg: '#FAFAF9',
          surface: '#F5F5F4',
          'surface-raised': '#E7E5E4',
          'text-primary': '#1C1917',
          'text-secondary': '#57534E',
          border: '#D6D3D1',
          success: '#16A34A',
          warning: '#D97706',
          error: '#DC2626',
        }
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Playfair Display', 'serif'],
        body: ['var(--font-source-sans)', 'Source Sans 3', 'sans-serif'],
        code: ['var(--font-fira-code)', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 16px rgba(28,25,23,0.06)',
        'card-hover': '0 8px 24px rgba(28,25,23,0.09)',
        'primary-glow': '0 4px 12px rgba(194,65,12,0.25)',
        modal: '0 24px 48px rgba(28,25,23,0.12)',
        drawer: '0 0 48px rgba(28,25,23,0.14)',
      },
      borderRadius: {
        btn: '8px',
        card: '12px',
        input: '8px',
        chip: '9999px',
      }
    },
  },
  plugins: [],
}
