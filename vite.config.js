import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [
    glsl({
      // Process .glsl, .vert, .frag files and support #include directives
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
      warnDuplicatedImports: true,
      compress: false, // keep readable in dev; enable for prod if desired
    }),
  ],
  server: {
    host: '0.0.0.0', // Required: enables access via ngrok for AR device testing
    port: 3000,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [],
    },
  },
});
