import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: 'node_modules/.vite_custom_cache',

  // Build optimizations for lazy loading
  build: {
    // Enable rollup's code splitting optimizations
    rollupOptions: {
      // External config.js file
      external: ['/config.js'],
      output: {
        // Create more granular chunks for better lazy loading
        manualChunks: {
          // Group vendor dependencies
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          // Group UI library
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          // Group data fetching
          query: ['@tanstack/react-query'],
          // Group form libraries
          forms: ['react-hook-form', 'zod'],
        },
        // Optimize chunk names for better debugging
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk';
          return `js/${facadeModuleId || 'chunk'}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Generate source maps for production debugging
    sourcemap: mode === 'production' ? false : true,
    // Reduce console output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },

  server: {
    host: "::",
    port: 8080,
    fs: {
      strict: false,
    },
    watch: {
      usePolling: true,
    },
    // Optimized HMR for lazy loading
    hmr: {
      overlay: true,
    },
  },

  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'react-hook-form',
      'zod',
      'axios',
    ],
  },
}));
