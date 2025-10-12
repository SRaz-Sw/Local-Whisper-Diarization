import type { RouterClient } from "@orpc/server";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient, onError } from "@orpc/client";
import { ContractRouterClient } from "@orpc/contract";
import { router } from "./../../../../../../server_orpc/src/routers";
import { createTanstackQueryUtils } from "@orpc/tanstack-query"; // todo: add this back in when we have a use case for it
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { getToken } from "../../token";

const link = new RPCLink({
  url: "http://localhost:3010/rpc",
  headers: () => {
    const token = getToken();
    console.log(
      "🔑 oRPC Request - Using token:",
      token ? `${token.substring(0, 20)}...` : "No token",
    );
    return {
      // Use x-access-token header to match your existing REST API pattern

      "x-access-token": token,
      // Alternative: use Authorization header with Bearer prefix
      // authorization: `Bearer ${token}`,
    };
  },
  // fetch: <-- provide fetch polyfill fetch if needed
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// Create a client for your router
export const client: RouterClient<typeof router> = createORPCClient(link);

//just add this line and you have tanstack query integrated
export const orpc = createTanstackQueryUtils(client);

export type ApiInputs = InferRouterInputs<typeof router>;
export type ApiOutputs = InferRouterOutputs<typeof router>;

// export type test_inputs = ApiInputs["auth"]["login"];

// Example usage of public procedure (no auth required)
const testPublicProcedure = client.auth.login({
  email: "test@test.com",
  password: "test",
});
console.log("testPublicProcedure", testPublicProcedure);

// Example usage of authenticated procedure (token automatically added via headers function above)
const testPrivateProcedure = client.auth.me({});
console.log("testPrivateProcedure", testPrivateProcedure);
