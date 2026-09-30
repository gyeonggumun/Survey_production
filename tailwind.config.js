/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        moa: {
          ink: '#17302f',
          green: '#188f7b',
          mint: '#eaf7f3',
          canvas: '#f5f8f7',
        },
      },
      boxShadow: {
        soft: '0 12px 32px rgba(32, 68, 60, 0.06)',
      },
    },
  },
  plugins: [],
};
