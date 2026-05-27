import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js alone is ~750 kB minified; hub no longer loads it (lazy studio).
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/')
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});
