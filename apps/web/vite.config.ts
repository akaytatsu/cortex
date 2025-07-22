import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

// Remove the websocket plugin for now - will start server on demand

export default defineConfig({
  server: {
    port: 8080,
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      ignoredRouteFiles: ["**/*.test.*"],
      serverNodeBuiltinsPolyfill: {
        modules: {
          path: true,
          fs: true,
        },
      },
    }),
    tsconfigPaths(),
  ],
  ssr: {
    noExternal: [],
    external: ["node-pty"],
  },
  optimizeDeps: {
    exclude: ["node-pty"],
  },
  define: {
    global: 'globalThis',
  },
});
