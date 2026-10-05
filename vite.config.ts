import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Django API runs on :8000; in production set VITE_API_URL.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
