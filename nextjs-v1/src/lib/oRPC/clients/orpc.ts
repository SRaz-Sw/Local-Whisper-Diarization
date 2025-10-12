import type { RouterClient } from "@orpc/server";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { router } from "@/lib/oRPC/server/router";
import { createTanstackQueryUtils } from "@orpc/tanstack-query"; // todo: add this back in when we have a use case for it
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";

const ORPC_SERVER_URL =
  process.env.NEXT_PUBLIC_ORPC_SERVER_URL ||
  // "http://localhost:3010/oRPC-test/rpc";
  "http://localhost:3000/oRPC-test/rpc";

declare global {
  var $client: RouterClient<typeof router> | undefined;
}

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      // See client/nextjs-v1/src/lib/oRPC/client/README.md
      throw new Error("RPCLink is not allowed on the server side.");
    }

    // return ORPC_SERVER_URL;
    return `${window.location.origin}/oRPC-test/rpc`;
  },
});

/**
 * Fallback to client-side client if server-side client is not available. [server side is for SSR]
 */
export const client: RouterClient<typeof router> =
  globalThis.$client ?? createORPCClient(link);

//just add this line and you have tanstack query integrated
export const orpc = createTanstackQueryUtils(client);

export type ApiInputs = InferRouterInputs<typeof router>;
export type ApiOutputs = InferRouterOutputs<typeof router>;
