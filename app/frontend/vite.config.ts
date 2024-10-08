import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import rollupVisualizer from "rollup-plugin-visualizer";
import viteInspect from "vite-plugin-inspect";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    envDir: ".",
    base: "/app",
    server: {
      port: 3000,
      strictPort: true,
    },
    worker: {
      format: "es",
    },
    plugins: [
      svgr({
        svgrOptions: {
          svgoConfig: {
            plugins: [
              "removedEditorsNSData",
            ]
          }
        }
      }),
      react(),
      ...(mode === "development" ? [viteInspect({ build: true })] : []),
    ],
    css: {
      preprocessorOptions: {
        includePaths: ["node_modules"],
      },
    },
    optimizeDeps: {
      extensions: [".scss"],
      esbuildOptions: {
        loader: {
          ".svg": "dataurl",
          ".woff": "dataurl",
          ".eot": "dataurl",
          ".ttf": "dataurl",
          ".woff2": "dataurl",
          ".cur": "dataurl",
        },
      },
    },
    define: {
      "process.env": process.env,
      // REPORTME: needed for use-pouchdb package which seems to be bundled
      // expecting node.js global polyfills
      "global": "globalThis",
    },
    build: {
      minify: mode === "production" && "esbuild",
      sourcemap: mode === "development",
      rollupOptions: {
        // NOTE: rollup plugins are mostly treated as vite plugins that take place after normal vite-plugins
        // they may not be compatible at all, so be warned
        plugins: [
          rollupVisualizer({
            template: "sunburst",
            open: true,
            gzipSize: true,
            brotliSize: true,
            filename: "rollup-bundle-analysis.html"
          }),
        ],
      },
    },
  };
});
