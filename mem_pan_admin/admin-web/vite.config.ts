import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/v1": {
        target: "https://8000-firebase-mempan-1777020210436.cluster-73qgvk7hjjadkrjeyexca5ivva.cloudworkstations.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
