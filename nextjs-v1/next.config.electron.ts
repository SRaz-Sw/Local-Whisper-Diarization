import type { NextConfig } from "next";

// Electron-specific Next.js configuration
// This config is temporarily swapped in by scripts/build-electron.js
// It configures Next.js for static export with Electron-compatible paths

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "font-src 'self'",
  "frame-src 'self'",
  "connect-src 'self' data: blob: https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://cas-bridge.xethub.hf.co https://*.hf.co",
  "worker-src 'self' blob:",
];

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  // Static export for Electron - generates static HTML files
  output: "export",

  // Use absolute paths for assets (required by next/font)
  // Electron's protocol handler will resolve these correctly
  assetPrefix: "/",

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slash for static files
  trailingSlash: true,

  devIndicators: false,
  poweredByHeader: false,
  reactStrictMode: true,

  // Skip type checking and ESLint for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for Web Workers and Electron
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Don't bundle electron in the client
    if (!isServer) {
      config.externals = {
        ...config.externals,
        electron: "electron",
      };
    }

    return config;
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
