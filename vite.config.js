import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  logLevel: 'warn',
  optimizeDeps: {
    disabled: false,
    exclude: [
      '@angular/core',
      '@angular/common',
      '@angular/platform-browser',
      '@angular/platform-browser-dynamic',
      '@angular/router',
      '@angular/forms',
      '@angular/material',
      '@angular/material/core',
      '@angular/material/button',
      '@angular/material/icon',
      '@angular/material/snack-bar',
      '@angular/material/progress-spinner',
      '@angular/material/tooltip',
      'rxjs',
      'rxjs/operators',
      'zone.js'
    ],
    include: [],
    force: true,
    holdUntilCrawlEnd: false
  },
  server: {
    fs: {
      allow: ['..'],
      strict: false
    },
    hmr: {
      overlay: false
    }
  },
  build: {
    rollupOptions: {
      external: [],
      onwarn: (warning, warn) => {
        // Suppress specific warnings
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        warn(warning);
      }
    },
    commonjsOptions: {
      include: [],
      ignoreTryCatch: false
    }
  },
  esbuild: {
    logOverride: { 
      'this-is-undefined-in-esm': 'silent',
      'commonjs-proxy-export': 'silent'
    }
  }
});