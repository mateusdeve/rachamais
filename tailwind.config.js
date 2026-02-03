/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#10b748',
        'primary-dark': '#059669',
        secondary: '#7C3AED',
        'secondary-dark': '#6D28D9',
        positive: '#10B981',
        negative: '#EF4444',
        danger: '#ef4444',
        surface: '#F9FAFB',
        border: '#E5E7EB',
        'text-primary': '#111813',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        'background-light': '#f6f8f6',
        'background-dark': '#102216',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
