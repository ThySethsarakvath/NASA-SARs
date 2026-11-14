import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { events: 'events/' } },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'], restoreMocks: true },
})
