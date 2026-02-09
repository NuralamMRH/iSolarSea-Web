// vite.config.ts
import { defineConfig } from "file:///D:/devlopment/itrucksea-trace-link/node_modules/vite/dist/node/index.js";
import react from "file:///D:/devlopment/itrucksea-trace-link/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///D:/devlopment/itrucksea-trace-link/node_modules/lovable-tagger/dist/index.js";
import fs from "node:fs";
import viteCompression from "file:///D:/devlopment/itrucksea-trace-link/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_dirname = "D:\\devlopment\\itrucksea-trace-link";
var vite_config_default = defineConfig(({ mode }) => {
  if (mode === "production") {
    process.env.NODE_ENV = "production";
  }
  return {
    server: {
      host: "::",
      port: 5173,
      hmr: {
        overlay: false
      },
      https: mode === "development" ? (() => {
        try {
          const keyPath = path.resolve(__vite_injected_original_dirname, ".certs/key.pem");
          const certPath = path.resolve(__vite_injected_original_dirname, ".certs/cert.pem");
          if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            return {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath)
            };
          }
        } catch (_) {
        }
        return void 0;
      })() : false,
      allowedHosts: mode === "development" ? true : ["itrucksea.com", "www.itrucksea.com"],
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          rewrite: (path2) => path2
        },
        "/uploads": {
          target: "http://localhost:8080",
          changeOrigin: true,
          rewrite: (path2) => `/public${path2}`
        },
        ...process.env.VITE_SUPABASE_URL ? {
          "/rest/v1": {
            target: process.env.VITE_SUPABASE_URL,
            changeOrigin: true,
            rewrite: (path2) => path2,
            ...process.env.VITE_SUPABASE_ANON_KEY ? {
              headers: {
                apikey: process.env.VITE_SUPABASE_ANON_KEY
              }
            } : {}
          }
        } : {}
      }
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Compression for production
      mode === "production" && viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024,
        minRatio: 0.8
      }),
      mode === "production" && viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024,
        minRatio: 0.8
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
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
        "tailwind-merge"
      ],
      esbuildOptions: {
        target: "es2020"
      }
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
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop()?.replace(".tsx", "").replace(".ts", "") : "chunk";
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
          }
        }
      },
      chunkSizeWarningLimit: 1e3,
      sourcemap: mode === "development",
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize asset inlining
      assetsInlineLimit: 4096
    },
    css: {
      devSourcemap: mode === "development"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxkZXZsb3BtZW50XFxcXGl0cnVja3NlYS10cmFjZS1saW5rXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxkZXZsb3BtZW50XFxcXGl0cnVja3NlYS10cmFjZS1saW5rXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9kZXZsb3BtZW50L2l0cnVja3NlYS10cmFjZS1saW5rL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5pbXBvcnQgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB2aXRlQ29tcHJlc3Npb24gZnJvbSBcInZpdGUtcGx1Z2luLWNvbXByZXNzaW9uXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIFNldCBOT0RFX0VOViBmb3IgcHJvZHVjdGlvbiBidWlsZHNcbiAgaWYgKG1vZGUgPT09IFwicHJvZHVjdGlvblwiKSB7XG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPSBcInByb2R1Y3Rpb25cIjtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiBcIjo6XCIsXG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgaG1yOiB7XG4gICAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGh0dHBzOlxuICAgICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCJcbiAgICAgICAgICA/ICgoKSA9PiB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5UGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLmNlcnRzL2tleS5wZW1cIik7XG4gICAgICAgICAgICAgICAgY29uc3QgY2VydFBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi5jZXJ0cy9jZXJ0LnBlbVwiKTtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhrZXlQYXRoKSAmJiBmcy5leGlzdHNTeW5jKGNlcnRQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAga2V5OiBmcy5yZWFkRmlsZVN5bmMoa2V5UGF0aCksXG4gICAgICAgICAgICAgICAgICAgIGNlcnQ6IGZzLnJlYWRGaWxlU3luYyhjZXJ0UGF0aCksXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgICAgIC8vIGlnbm9yZSBhbmQgZmFsbCBiYWNrIHRvIEhUVFBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSkoKVxuICAgICAgICAgIDogZmFsc2UsXG4gICAgICBhbGxvd2VkSG9zdHM6XG4gICAgICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiA/IHRydWUgOiBbXCJpdHJ1Y2tzZWEuY29tXCIsIFwid3d3Lml0cnVja3NlYS5jb21cIl0sXG4gICAgICBwcm94eToge1xuICAgICAgICBcIi9hcGlcIjoge1xuICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjgwODBcIixcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIFwiL3VwbG9hZHNcIjoge1xuICAgICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjgwODBcIixcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IGAvcHVibGljJHtwYXRofWAsXG4gICAgICAgIH0sXG4gICAgICAgIC4uLihwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBcIi9yZXN0L3YxXCI6IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMLFxuICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aCxcbiAgICAgICAgICAgICAgICAuLi4ocHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9BTk9OX0tFWVxuICAgICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBpa2V5OiBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX0FOT05fS0VZLFxuICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIDoge30pLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDoge30pLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgICAvLyBDb21wcmVzc2lvbiBmb3IgcHJvZHVjdGlvblxuICAgICAgbW9kZSA9PT0gXCJwcm9kdWN0aW9uXCIgJiZcbiAgICAgICAgdml0ZUNvbXByZXNzaW9uKHtcbiAgICAgICAgICBhbGdvcml0aG06IFwiZ3ppcFwiLFxuICAgICAgICAgIGV4dDogXCIuZ3pcIixcbiAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgICAgICAgbWluUmF0aW86IDAuOCxcbiAgICAgICAgfSksXG4gICAgICBtb2RlID09PSBcInByb2R1Y3Rpb25cIiAmJlxuICAgICAgICB2aXRlQ29tcHJlc3Npb24oe1xuICAgICAgICAgIGFsZ29yaXRobTogXCJicm90bGlDb21wcmVzc1wiLFxuICAgICAgICAgIGV4dDogXCIuYnJcIixcbiAgICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgICAgICAgbWluUmF0aW86IDAuOCxcbiAgICAgICAgfSksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICB9LFxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBleGNsdWRlOiBbXCIuZ2l0XCJdLFxuICAgICAgaW5jbHVkZTogW1xuICAgICAgICBcInJlYWN0XCIsXG4gICAgICAgIFwicmVhY3QtZG9tXCIsXG4gICAgICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiLFxuICAgICAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1kaWFsb2dcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudVwiLFxuICAgICAgICBcIkByYWRpeC11aS9yZWFjdC1zZWxlY3RcIixcbiAgICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcFwiLFxuICAgICAgICBcImx1Y2lkZS1yZWFjdFwiLFxuICAgICAgICBcImNsYXNzLXZhcmlhbmNlLWF1dGhvcml0eVwiLFxuICAgICAgICBcImNsc3hcIixcbiAgICAgICAgXCJ0YWlsd2luZC1tZXJnZVwiLFxuICAgICAgXSxcbiAgICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICAgIHRhcmdldDogXCJlczIwMjBcIixcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgdGFyZ2V0OiBcImVzMjAyMFwiLFxuICAgICAgbWluaWZ5OiBcImVzYnVpbGRcIixcbiAgICAgIC8vIENvcHkgcHVibGljIGFzc2V0cyB0byBkaXN0XG4gICAgICBjb3B5UHVibGljRGlyOiB0cnVlLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBleHRlcm5hbDogW1wiLmdpdFwiXSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQpID0+IHtcbiAgICAgICAgICAgIC8vIFBhZ2UgY2h1bmtzIGZvciBiZXR0ZXIgY29kZSBzcGxpdHRpbmdcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIi9wYWdlcy9cIikpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGFnZU5hbWUgPSBpZC5zcGxpdChcIi9wYWdlcy9cIilbMV0uc3BsaXQoXCIvXCIpWzBdO1xuICAgICAgICAgICAgICBpZiAocGFnZU5hbWUgPT09IFwiZGFzaGJvYXJkXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJkYXNoYm9hcmRcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocGFnZU5hbWUgPT09IFwidmVzc2VsLW1hbmFnZW1lbnRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInZlc3NlbC1tYW5hZ2VtZW50XCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHBhZ2VOYW1lID09PSBcImZpc2hpbmctbG9nXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJmaXNoaW5nLWxvZ1wiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChwYWdlTmFtZSA9PT0gXCJhdWN0aW9uLW1hcmtldFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYXVjdGlvbi1tYXJrZXRcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAocGFnZU5hbWUgPT09IFwicHJvY2Vzc2luZy1wbGFudFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicHJvY2Vzc2luZy1wbGFudFwiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChwYWdlTmFtZSA9PT0gXCJyZXF1ZXN0LXRvLWRvY2tcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInJlcXVlc3QtdG8tZG9ja1wiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChwYWdlTmFtZSA9PT0gXCJ0cmFuc3BvcnRhdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNwb3J0YXRpb25cIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gXCJwYWdlc1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgLy8gT3B0aW1pemUgY2h1bmsgbmFtZXNcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogKGNodW5rSW5mbykgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmFjYWRlTW9kdWxlSWQgPSBjaHVua0luZm8uZmFjYWRlTW9kdWxlSWRcbiAgICAgICAgICAgICAgPyBjaHVua0luZm8uZmFjYWRlTW9kdWxlSWRcbiAgICAgICAgICAgICAgICAgIC5zcGxpdChcIi9cIilcbiAgICAgICAgICAgICAgICAgIC5wb3AoKVxuICAgICAgICAgICAgICAgICAgPy5yZXBsYWNlKFwiLnRzeFwiLCBcIlwiKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoXCIudHNcIiwgXCJcIilcbiAgICAgICAgICAgICAgOiBcImNodW5rXCI7XG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdLmpzYDtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiBcImFzc2V0cy9bbmFtZV0tW2hhc2hdLmpzXCIsXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhc3NldEluZm8ubmFtZS5zcGxpdChcIi5cIik7XG4gICAgICAgICAgICBjb25zdCBleHQgPSBpbmZvW2luZm8ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAoL1xcLihjc3MpJC8udGVzdChhc3NldEluZm8ubmFtZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXS4ke2V4dH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfHN2Z3xnaWZ8dGlmZnxibXB8aWNvKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xuICAgICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9pbWFnZXMvW25hbWVdLVtoYXNoXS4ke2V4dH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC9cXC4od29mZjI/fGVvdHx0dGZ8b3RmKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xuICAgICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9mb250cy9bbmFtZV0tW2hhc2hdLiR7ZXh0fWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdLiR7ZXh0fWA7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIixcbiAgICAgIC8vIEVuYWJsZSBDU1MgY29kZSBzcGxpdHRpbmdcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICAgIC8vIE9wdGltaXplIGFzc2V0IGlubGluaW5nXG4gICAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NixcbiAgICB9LFxuICAgIGNzczoge1xuICAgICAgZGV2U291cmNlbWFwOiBtb2RlID09PSBcImRldmVsb3BtZW50XCIsXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4UixTQUFTLG9CQUFvQjtBQUMzVCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLE9BQU8sUUFBUTtBQUNmLE9BQU8scUJBQXFCO0FBTDVCLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLE1BQUksU0FBUyxjQUFjO0FBQ3pCLFlBQVEsSUFBSSxXQUFXO0FBQUEsRUFDekI7QUFFQSxTQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixLQUFLO0FBQUEsUUFDSCxTQUFTO0FBQUEsTUFDWDtBQUFBLE1BQ0EsT0FDRSxTQUFTLGlCQUNKLE1BQU07QUFDTCxZQUFJO0FBQ0YsZ0JBQU0sVUFBVSxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQ3hELGdCQUFNLFdBQVcsS0FBSyxRQUFRLGtDQUFXLGlCQUFpQjtBQUMxRCxjQUFJLEdBQUcsV0FBVyxPQUFPLEtBQUssR0FBRyxXQUFXLFFBQVEsR0FBRztBQUNyRCxtQkFBTztBQUFBLGNBQ0wsS0FBSyxHQUFHLGFBQWEsT0FBTztBQUFBLGNBQzVCLE1BQU0sR0FBRyxhQUFhLFFBQVE7QUFBQSxZQUNoQztBQUFBLFVBQ0Y7QUFBQSxRQUNGLFNBQVMsR0FBRztBQUFBLFFBRVo7QUFDQSxlQUFPO0FBQUEsTUFDVCxHQUFHLElBQ0g7QUFBQSxNQUNOLGNBQ0UsU0FBUyxnQkFBZ0IsT0FBTyxDQUFDLGlCQUFpQixtQkFBbUI7QUFBQSxNQUN2RSxPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEs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
