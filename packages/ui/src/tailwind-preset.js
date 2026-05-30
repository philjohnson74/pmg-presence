/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        // PMG brand colours — always 100% solid, never tinted (brand guidelines p.14)
        'pmg-navy': '#0b2551',
        'pmg-orange': '#ec6a05',
        'pmg-cyan': '#00b5ec',
        'pmg-green': '#19d296',
        // Evacuation semantic colours — scoped to roll-call view only, not brand accents
        'rollcall-red': '#d7263d',
        'rollcall-amber': '#ec6a05',
        'rollcall-green': '#19d296',
      },
      fontFamily: {
        // Outfit from Google Fonts; Arial fallback (brand guidelines p.16)
        sans: ['Outfit', 'Arial', 'sans-serif'],
      },
    },
  },
};
