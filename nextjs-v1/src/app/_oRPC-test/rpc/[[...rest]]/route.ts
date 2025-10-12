// BACKEND FETCHING REQUESTS HERE!
import { router } from "@/lib/oRPC/server/router";
import { RPCHandler } from "@orpc/server/fetch";

// Required for static export in Next.js
export const dynamic = "force-static";
export const revalidate = false;

const handler = new RPCHandler(router);

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: "/oRPC-test/rpc",
    context: {}, // Provide initial context if needed
  });

  return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
