/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        sidebar: 'var(--color-sidebar)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)'
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          faint: 'var(--color-text-faint)',
          ghost: 'var(--color-text-hint)',
          hint: 'var(--color-text-hint)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'rgba(37,99,235,0.08)',
          focus: 'rgba(37,99,235,0.18)'
        },
        file: {
          pdf: '#F97316',
          doc: '#3B82F6',
          xls: '#22C55E',
          ppt: '#EF4444',
          img: '#8B5CF6',
          other: '#9CA3AF'
        },
        dot: {
          green: '#16A34A',
          blue: '#2563EB',
          red: '#EF4444',
          gray: '#A1A1AA'
        }
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif']
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        btn: '9px',
        lg: '12px',
        xl: '14px',
        '2xl': '16px'
      },
      boxShadow: {
        window: '0 30px 70px -22px rgba(20,22,34,.30), 0 4px 14px -6px rgba(20,22,34,.10)',
        input: '0 2px 12px -5px rgba(20,22,34,.10)',
        'input-focus': '0 0 0 3px rgba(37,99,235,0.12), 0 2px 12px -5px rgba(20,22,34,.10)',
        card: '0 1px 3px rgba(20,22,34,.05)'
      },
      animation: {
        'fade-up': 'fadeUp .4s cubic-bezier(.4,0,.2,1) both',
        'fade-in': 'fadeIn .25s ease both',
        'dot-1': 'dot 1.2s infinite',
        'dot-2': 'dot 1.2s infinite .18s',
        'dot-3': 'dot 1.2s infinite .36s'
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(9px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        dot: {
          '0%, 70%, 100%': { transform: 'translateY(0)', opacity: '.35' },
          '35%': { transform: 'translateY(-4px)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
