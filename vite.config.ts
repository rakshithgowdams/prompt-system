import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query': ['@tanstack/react-query'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['framer-motion', 'lucide-react', 'sonner'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'files': ['jszip', 'file-saver', 'browser-image-compression'],
        },
      },
    },
  },
});
