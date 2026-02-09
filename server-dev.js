// Development server with proper security headers
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  // Performance headers
  if (
    req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }

  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "dist")));

// API proxy
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:8081",
    changeOrigin: true,
  })
);

// Uploads proxy
app.use(
  "/uploads",
  createProxyMiddleware({
    target: "http://localhost:8081/public/uploads",
    changeOrigin: true,
    pathRewrite: {
      "^/uploads": "",
    },
  })
);

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Development server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, "dist")}`);
  console.log(`🔒 Security headers enabled`);
});
