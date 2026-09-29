import { defineConfig } from 'vite';

// Relative asset paths, so the build works from any subpath, such as a GitHub Pages project site.
export default defineConfig({
  base: './',
  // The SDK loads lazily; pre-bundling it up front keeps its first import from reloading the page.
  optimizeDeps: { include: ['@anthropic-ai/sdk'] },
});
