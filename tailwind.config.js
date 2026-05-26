/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '390px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
        serif:   ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#F5EBFD',
          100: '#E3CFFA',
          200: '#C99BF5',
          300: '#B167F0',
          400: '#A435F0',
          500: '#8710D8',
          600: '#6D28A8',
          700: '#551F82',
          800: '#3E175F',
          900: '#2B1043',
        },
        ink: {
          900: '#1C1D1F',
          700: '#2D2F31',
          500: '#6A6F73',
          300: '#D1D7DC',
          100: '#F7F9FA',
          50:  '#FFFFFF',
        },
        gradient: {
          start: '#A435F0',
          mid:   '#7C3AED',
          end:   '#EC4899',
        },
        neon: {
          purple: '#B167F0',
          pink:   '#F472B6',
          blue:   '#60A5FA',
        },
        rating:  '#E59819',
        success: '#1E7F4A',
        danger:  '#D1342C',
      },
      boxShadow: {
        card:       '0 2px 4px rgba(0,0,0,0.08),0 4px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 8px rgba(0,0,0,0.12),0 8px 24px rgba(0,0,0,0.12)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-sweep': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%':   { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%':       { transform: 'translate(30px,-50px) scale(1.1)' },
          '66%':       { transform: 'translate(-20px,20px) scale(0.9)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-12px)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        ripple: {
          from: { transform: 'scale(0)', opacity: '0.4' },
          to:   { transform: 'scale(1)', opacity: '0' },
        },
      },
      animation: {
        'fade-in':        'fadeIn 0.15s ease-out',
        'slide-up':       'slideUp 0.2s ease-out',
        'skeleton-sweep': 'skeleton-sweep 1.8s ease-in-out infinite',
        marquee:          'marquee 30s linear infinite',
        'marquee-reverse': 'marquee-reverse 30s linear infinite',
        blob:             'blob 12s ease-in-out infinite',
        shimmer:          'shimmer 3s linear infinite',
        float:            'float 4s ease-in-out infinite',
        'fade-in-up':     'fade-in-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
