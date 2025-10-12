// instrumentation.ts (must be Inside 'src/' folder)
// ✅ For oRPC Server Side Rendering (SSR)
export async function register() {
  // You can import from wherever you want
  await import("./lib/oRPC/clients/orpc.server");
}

/**
 * What it does:

This ensures lib/orpc.server.ts is imported before any other code on the server Optimize Server-Side Rendering (SSR) for Fullstack Frameworks - oRPC
Next.js calls the register() function during server startup
This sets up the server-side client in globalThis.$client before any pages render

 * Why it's needed:

The server-side client needs to be available globally before any SSR rendering happens
Next.js's instrumentation.ts is the earliest hook for server initialization
Without this, the server-side client wouldn't be ready when components try to fetch data during SSR


see - https://orpc.unnoq.com/docs/best-practices/optimize-ssr
 */
