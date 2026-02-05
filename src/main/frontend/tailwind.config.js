/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        'primary-dark': 'var(--color-primary-dark)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        highlight: 'var(--color-highlight)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-overlay': 'var(--color-surface-overlay)',
        background: 'var(--color-background)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32',
        'hr-zone-1': '#87CEEB',
        'hr-zone-2': '#0D47A1',
        'hr-zone-3': '#FFA500',
        'hr-zone-4': '#2E7D32',
        'hr-zone-5': '#8B0000',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.25)',
        'neon': '0 0 5px var(--color-accent), 0 0 20px var(--color-accent)',
        'neon-lg': '0 0 10px var(--color-accent), 0 0 40px var(--color-accent)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'swim': 'swim 3s ease-in-out infinite',
        'wave': 'wave 2.5s ease-in-out infinite',
        'ripple': 'ripple 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px var(--color-accent)' },
          '50%': { boxShadow: '0 0 20px var(--color-accent), 0 0 30px var(--color-accent)' },
        },
        swim: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
        wave: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '25%': { transform: 'translateY(-5px) rotate(2deg)' },
          '75%': { transform: 'translateY(5px) rotate(-2deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'pool-lanes': 'repeating-linear-gradient(90deg, var(--color-primary) 0px, var(--color-primary) 2px, transparent 2px, transparent 50px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
