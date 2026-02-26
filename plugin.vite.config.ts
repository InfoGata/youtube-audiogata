// plugin.vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    viteSingleFile()
  ],
  define: {
    // Required for some libraries that check for Node.js environment
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      // Polyfill for Node.js buffer if needed
      buffer: 'buffer',
    },
  },
  build: {
    minify: true,
    target: 'esnext',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.ts'),
      output: {
        entryFileNames: 'index.js',
      }
    }
  },
  optimizeDeps: {
    include: ['googlevideo', 'bgutils-js', 'shaka-player'],
  },
})
