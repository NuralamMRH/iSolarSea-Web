import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "node:fs";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Set NODE_ENV for production builds
  if (mode === "production") {
    process.env.NODE_ENV = "production";
  }

  return {
    server: {
      host: "::",
      port: 5175,
      hmr: {
        overlay: false,
      },
      https:
        mode === "development"
          ? (() => {
              try {
                const keyPath = path.resolve(__dirname, ".certs/key.pem");
                const certPath = path.resolve(__dirname, ".certs/cert.pem");
                if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
                  return {
                    key: fs.readFileSync(keyPath),
                    cert: fs.readFileSync(certPath),
                  };
                }
              } catch (_) {
                // ignore and fall back to HTTP
              }
              return undefined;
            })()
          : false,
      allowedHosts:
        mode === "development" ? true : ["itrucksea.com", "www.itrucksea.com"],
      proxy: {
        "/api": {
          target: "http://localhost:8081",
          changeOrigin: true,
          rewrite: (path) => path,
        },
        "/uploads": {
          target: "http://localhost:8081",
          changeOrigin: true,
          rewrite: (path) => `/public${path}`,
        },
        ...(process.env.VITE_SUPABASE_URL
          ? {
              "/rest/v1": {
                target: process.env.VITE_SUPABASE_URL,
                changeOrigin: true,
                rewrite: (path) => path,
                ...(process.env.VITE_SUPABASE_ANON_KEY
                  ? {
                      headers: {
                        apikey: process.env.VITE_SUPABASE_ANON_KEY,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Compression for production
      mode === "production" &&
        viteCompression({
          algorithm: "gzip",
          ext: ".gz",
          threshold: 1024,
          minRatio: 0.8,
        }),
      mode === "production" &&
        viteCompression({
          algorithm: "brotliCompress",
          ext: ".br",
          threshold: 1024,
          minRatio: 0.8,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: [".git"],
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-select",
        "@radix-ui/react-tooltip",
        "lucide-react",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
      esbuildOptions: {
        target: "es2020",
      },
    },
    build: {
      target: "es2020",
      minify: "esbuild",
      // Copy public assets to dist
      copyPublicDir: true,
      rollupOptions: {
        external: [".git"],
        output: {
          manualChunks: (id) => {
            // Page chunks for better code splitting
            if (id.includes("/pages/")) {
              const pageName = id.split("/pages/")[1].split("/")[0];
              if (pageName === "dashboard") {
                return "dashboard";
              }
              if (pageName === "vessel-management") {
                return "vessel-management";
              }
              if (pageName === "fishing-log") {
                return "fishing-log";
              }
              if (pageName === "auction-market") {
                return "auction-market";
              }
              if (pageName === "processing-plant") {
                return "processing-plant";
              }
              if (pageName === "request-to-dock") {
                return "request-to-dock";
              }
              if (pageName === "transportation") {
                return "transportation";
              }
              return "pages";
            }
          },
          // Optimize chunk names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId
                  .split("/")
                  .pop()
                  ?.replace(".tsx", "")
                  .replace(".ts", "")
              : "chunk";
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name)) {
              return `assets/[name]-[hash].${ext}`;
            }
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: mode === "development",
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize asset inlining
      assetsInlineLimit: 4096,
    },
    css: {
      devSourcemap: mode === "development",
    },
  };
});
