/** @type {import('tailwindcss').Config} */
export const pmgPreset = {
  theme: {
    extend: {
      colors: {
        // PMG brand colours — always 100% solid, never tinted (brand guidelines p.14)
        'pmg-navy': '#0b2551',
        'pmg-orange': '#ec6a05',
        'pmg-cyan': '#00b5ec',
        'pmg-green': '#19d296',
        // Evacuation-mode semantic colours (scoped to roll-call view only — not brand accents)
        'rollcall-red': '#d7263d',
        'rollcall-amber': '#ec6a05', // re-uses pmg-orange at full saturation
        'rollcall-green': '#19d296', // re-uses pmg-green
      },
      fontFamily: {
        // Brand typeface: Outfit (Google Fonts), fallback Arial (brand guidelines p.16)
        sans: ['Outfit', 'Arial', 'sans-serif'],
      },
    },
  },
};
