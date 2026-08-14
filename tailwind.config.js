/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Parent world — warm, premium, calm
        paper: '#FCFAF5',
        ink: '#16241F',
        sprout: '#2FAE73',
        gold: '#F0A92E',
        line: '#ECE6DA',
        muted: '#8B948E',
        // Kid world — deep, playful
        // Driven by CSS vars so a child can repaint their own world; the
        // `<alpha-value>` placeholder is what keeps `bg-glow/15` working.
        kidbg1: 'rgb(var(--kid-bg1) / <alpha-value>)',
        kidbg2: 'rgb(var(--kid-bg2) / <alpha-value>)',
        glow: 'rgb(var(--kid-glow) / <alpha-value>)',
        // Streak flame
        berry: '#E2725B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        kid: '22px',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(22, 36, 31, 0.06)',
        card: '0 8px 30px rgba(22, 36, 31, 0.08)',
        glow: '0 0 30px rgba(67, 214, 160, 0.35)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'rise': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'jar-fill': {
          '0%': { height: 'var(--from)' },
          '100%': { height: 'var(--to)' },
        },
        'grow-up': {
          '0%': { transform: 'scale(0.6) translateY(20px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'confetti': {
          '0%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translateY(120px) rotate(360deg)', opacity: '0' },
        },
        'flame': {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)' },
          '50%': { transform: 'scale(1.12) rotate(2deg)' },
        },
        // A wrong PIN says so without words — the pad shakes the way a locked
        // door rattles, which a five-year-old reads faster than any message.
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-7px)' },
          '40%, 80%': { transform: 'translateX(7px)' },
        },
        // The finish-a-task tick: draw the circle, then punch the check in.
        'check-pop': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.25)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-46px) scale(1.15)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.4s ease-out',
        'rise': 'rise 0.4s ease-out',
        'grow-up': 'grow-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'confetti': 'confetti 1.2s ease-out forwards',
        'flame': 'flame 1.6s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'check-pop': 'check-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float-up': 'float-up 0.9s ease-out forwards',
      },
    },
  },
  plugins: [],
}
