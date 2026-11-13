/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ---------- Constants ----------

// Where `npm run dev` sends /api calls: the backend, run with `uvicorn main:app --reload`.
const API_URL = process.env.API_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': API_URL }, // same origin for the browser, so the API needs no CORS
  },
  test: {
    environment: 'jsdom', // a browser-like page for the components
    setupFiles: ['./src/test-setup.ts'],
  },
})
