import "server-only";
// FILE NAME AKA - orpc.server.ts nextjs-ssr-servers-client.ts - https://github.com/ski043/learn-orpc/blob/main/lib/orpc.server.ts
import { headers } from "next/headers";
import { createRouterClient } from "@orpc/server";
import { router } from "@/lib/oRPC/server/router";

// BACKEND'S CLIENT. FOR (NEXT JS's) SERVER SIDE RENDERING (SSR) https://youtu.be/uogRJKpAkUM?si=MZZ-8lyMeL46ipVS&t=393

globalThis.$client = createRouterClient(router, {
  /**
   * Provide initial context if needed.
   *
   * Because this client instance is shared across all requests,
   * only include context that's safe to reuse globally.
   * For per-request context, use middleware context or pass a function as the initial context.
   */
  context: async () => ({
    headers: await headers(), // provide headers if initial context required
  }),
});
