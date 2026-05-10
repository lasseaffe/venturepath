import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/trends': {
        target: 'https://trends.google.com',
        changeOrigin: true,
        rewrite: () => '/trends/trendingSearches/daily/rss?geo=US&category=travel',
      },
    },
  },
})
