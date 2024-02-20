/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/styles/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'background0': '#141827',
        'background1': '#070816',
        'box_black': '#0e111a',
        'box_gray': '#141b2b',
        'box_light_gray': '#293249',
        'box_hover_light_gray': '#303b56',
        'box_border': '#303341',
        'box_blue': '#4c82fb',
        'box_hover_blue': '#2172e5',
        'box_dark_blue': '#1d2c50',
        'text_gray': '#99a1bd',
        'text_dark_gray': '#3c445c',
        'text_blue': '#4c82fb',
        'text_dark_blue': '#0436a6',
      },
    },
  },
  plugins: [],
}
