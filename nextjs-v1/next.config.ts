import type { NextConfig } from "next";

// Content Security Policy (CSP) directives control what resources the browser is allowed to load
const cspDirectives = [
  // default-src: Fallback for other resource types not explicitly listed
  // 'self' means resources can only be loaded from the same origin
  "default-src 'self'",

  // script-src: Controls where JavaScript can be loaded from
  // 'unsafe-eval' allows functions like eval() - needed for some frameworks
  // 'unsafe-inline' allows inline scripts - often needed for React
  // Also allows scripts from YouTube domains
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net",
  // Added https://cdn.jsdelivr.net for the web transcription (see client/chat-whatsapp-clone/src/app/web-transc/page.tsx)
  // "https://cdn.jsdelivr.net",

  // style-src: Controls where stylesheets can be loaded from
  // 'unsafe-inline' allows inline styles (often needed for React/Next.js)
  "style-src 'self' 'unsafe-inline'",

  // img-src: Controls where images can be loaded from
  // data: allows data URIs for images (like base64 encoded images)
  // blob: allows Blob URLs for images (like from canvas.toBlob())
  // Also allows images from specific CDN domains
  "img-src 'self' data: blob: https://utfs.io https://i.ytimg.com https://img.yad2.co.il",

  // media-src: Controls where audio and video can be loaded from
  // blob: allows Blob URLs for media (needed for audio/video recording and playback)
  // data: allows data URIs for media
  "media-src 'self' blob: data:",

  // font-src: Controls where fonts can be loaded from
  "font-src 'self'",

  // frame-src: Controls where <iframe> content can be loaded from
  // Allows YouTube embeds
  "frame-src 'self' https://www.youtube.com",

  // connect-src: Controls where network requests (fetch, XHR, WebSocket) can go
  // data: and blob: needed for fetch API with data/blob URLs
  // Allows connections to various endpoints including Vercel, localhost, WebSockets, and HuggingFace CDN
  "connect-src 'self' data: blob: https://*.vercel.app https://*.vercel-insights.com https://huggingface.co https://cdn-lfs.huggingface.co http://localhost:* https://* ws: wss:",

  // worker-src: Controls where web workers can be loaded from
  "worker-src 'self' blob:",
];

// Security headers to protect against common web vulnerabilities
const securityHeaders = [
  {
    // X-DNS-Prefetch-Control: Controls DNS prefetching
    // 'on' allows the browser to proactively perform domain name resolution
    // Improves performance but might expose browsing behavior to DNS servers
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    // Strict-Transport-Security (HSTS): Forces browsers to use HTTPS
    // max-age=63072000: Remember to use HTTPS for ~2 years
    // includeSubDomains: Apply to all subdomains
    // preload: Include in browser HSTS preload list
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // X-XSS-Protection: Legacy header for older browsers to enable built-in XSS filters
    // 1: Enable XSS filtering
    // mode=block: Block the response if attack detected instead of sanitizing
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // X-Frame-Options: Prevents clickjacking attacks by controlling iframe embedding
    // SAMEORIGIN: Page can only be displayed in a frame on the same origin
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // X-Content-Type-Options: Prevents MIME type sniffing exploits
    // nosniff: Browsers must use the type specified in Content-Type
    // Prevents browsers from interpreting files as a different MIME type
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Referrer-Policy: Controls how much referrer information is sent
    // origin-when-cross-origin: Send full URL when staying on same origin,
    // only send the origin when navigating to a different origin
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    // Content-Security-Policy: The main defense against content injection attacks
    // Defined by the cspDirectives array and joined with semicolons
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
];

// Cross-Origin Resource Sharing (CORS) headers control how your API responds to requests from other origins
const corsHeaders = [
  {
    // Access-Control-Allow-Credentials: Allows cookies and credentials to be sent in cross-origin requests
    // true: Browsers will include credentials (cookies, auth headers) with requests
    key: "Access-Control-Allow-Credentials",
    value: "true",
  },
  {
    // Access-Control-Allow-Origin: Specifies which origins can access the resource
    // *: Any origin can access (not recommended for APIs that require authentication)
    // In production, you might want to specify allowed origins instead
    key: "Access-Control-Allow-Origin",
    value: "*",
  },
  {
    // Access-Control-Allow-Methods: Specifies which HTTP methods are allowed
    // Lists all the methods that your API endpoints support for CORS requests
    key: "Access-Control-Allow-Methods",
    value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  },
  {
    // Access-Control-Allow-Headers: Specifies which headers can be used in requests
    // Lists all the headers that your API accepts in CORS requests
    key: "Access-Control-Allow-Headers",
    value:
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  },
];

const nextConfig: NextConfig = {
  // Hide development indicators in the bottom-right corner
  devIndicators: false,

  // Enable gzip compression for responses
  compress: true,

  // Disable the "Powered by Next.js" header for security reasons
  poweredByHeader: false,

  // Enable React's strict mode for better development practices
  reactStrictMode: true,

  // SWC is a faster alternative to Babel for minification
  // swcMinify: true,

  // Define which external domains are allowed for Next.js Image component
  images: {
    domains: ["utfs.io", "i.ytimg.com", "img.yad2.co.il"],
  },

  // Speed optimizations for builds at the cost of type safety
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for Web Workers
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },

  // Apply security and CORS headers to all routes
  async headers() {
    return [
      {
        // Apply headers to all pages in the app (routes, API, static files)
        source: "/(.*)",
        headers: [...securityHeaders, ...corsHeaders],
      },
      {
        // Apply specific headers to API routes only
        // This is useful if you need different CORS settings for your API
        source: "/api/:path*",
        headers: corsHeaders,
      },
      {
        // Headers for Web Workers and WebGPU support (SharedArrayBuffer)
        source: "/workers/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// import type { NextConfig } from "next";

// const securityHeaders = [
//   {
//     key: 'X-DNS-Prefetch-Control',
//     value: 'on'
//   },
//   {
//     key: 'Strict-Transport-Security',
//     value: 'max-age=63072000; includeSubDomains; preload'
//   },
//   {
//     key: 'X-XSS-Protection',
//     value: '1; mode=block'
//   },
//   {
//     key: 'X-Frame-Options',
//     value: 'SAMEORIGIN'
//   },
//   {
//     key: 'X-Content-Type-Options',
//     value: 'nosniff'
//   },
//   {
//     key: 'Referrer-Policy',
//     value: 'origin-when-cross-origin'
//   },
//   {
//     key: 'Content-Security-Policy',
//     value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://utfs.io; font-src 'self'; connect-src 'self' https://*.vercel.app https://*.vercel-insights.com http://localhost:* https://* ws: wss:"
//   }
// ];

// const nextConfig: NextConfig = {
//   devIndicators: false,
//   compress: true,
//   poweredByHeader: false,
//   reactStrictMode: true,

//   // Speed up builds by using SWC
//   // swcMinify: true,

//     // Add image configuration
//     images: {
//       domains: ['utfs.io'],
//     },

//   // Skip type checking and ESLint for faster builds
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   eslint: {
//     ignoreDuringBuilds: true,
//   },

//   // Security headers
//   async headers() {
//     return [
//       {
//         source: '/(.*)',
//         headers: securityHeaders,
//       },
//     ];
//   },
// };

// export default nextConfig;
