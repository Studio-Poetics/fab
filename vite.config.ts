import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  resolve: {
    alias: {
      $core:    resolve('./src/core'),
      $modules: resolve('./src/modules'),
      $stores:  resolve('./src/stores'),
      $lib:     resolve('./src/lib'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep Three.js in its own lazy chunk shared by AssemblyView + GearThreeView
          three: ['three'],
        },
      },
    },
  },
});
