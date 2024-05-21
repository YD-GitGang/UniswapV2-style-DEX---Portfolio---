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
        'background0': '#0c110e',
        'background1': '#459439',
        'box_black': '#202725',
        'box_gray': '#323a38',
        'box_light_gray': '#3e504b',
        'box_hover_light_gray': '#4a645e',
        'box_border': '#405551',
        'box_blue': '#66c664',
        'box_hover_blue': '#3ad637',
        'box_dark_blue': '#465b56',
        'text_gray': '#a8b1ac',
        'text_dark_gray': '#646768',
        'text_blue': '#63b655',
        'text_dark_blue': '#618b5a',
      },
    },
  },
  plugins: [],
}
