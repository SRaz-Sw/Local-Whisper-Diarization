# How to implement oRPC in your project

## Table of Contents

- [1. Install Dependencies](#1-install-dependencies)
- [2. Create the Server](#2-create-the-server)
  - [2a. Create Route & Type](#2a-create-route--type)
    - [Defining Schema](#defining-schema)
    - [Defining Procedure](#defining-procedure)
  - [2b. Create The Router and Wire it to Endpoint](#2b-create-the-router-and-wire-it-to-endpoint)
    - [Define Index File](#define-index-file-that-exposes-all-of-the-routes-inside-of-the-routers-folder)
    - [Wire to API Route](#we-wire-to-an-actual-api-route)
- [3. Create Client(s)](#3-create-clients)
  - [A. Regular Main Client](#a-regular-main-client)
    - [Define Contact Point](#define-the-contact-point-at-the-clients-browser)
  - [B. Server-Side Client](#b-server-side-client)
    - [Step 1: Add Global Client](#step1-add-global-client-managed-by-regular-main-client)
    - [Step 2: Add Loading Script](#step-2-add-a-loading-script-must-be-inside-src-folder)
    - [Step 3: Import in Layout](#step-3-add-an-import-to-the-main-layouttsx)
- [4. Use oRPC Client in React Client Component](#4-use-orpc-client-in-react-client-component)
- [5. Infer Types from Backend to Frontend](#5infer-types-from-backend-to-frontend)
  - [Export ApiInputs & ApiOutputs](#1-export-apiinputs--apioutputs)
  - [Use the Types](#2-use-the-types-where-ever-you-need-them)
- [Advanced Features](#advanced-features)
  - [6. Using Middleware (Authentication)](#6-using-middleware-authentication)
    - [Creating Authentication Middleware](#creating-authentication-middleware)
    - [Using the Authentication Middleware](#using-the-authentication-middleware)
    - [Multiple Middleware Layers](#multiple-middleware-layers)
  - [7. Setting up OpenAPI Documentation with Scalar](#7-setting-up-openapi-documentation-with-scalar)
    - [Create OpenAPI Documentation Route](#create-openapi-documentation-route)
    - [Required Schema Files](#required-schema-files)
    - [Accessing the Documentation](#accessing-the-documentation)
    - [Features of the Generated Documentation](#features-of-the-generated-documentation)
    - [Customizing the Documentation](#customizing-the-documentation)

---

## 1. Install Dependencies

add the following packages to package.json:

```json
    "@orpc/client": "^1.8.8",
    "@orpc/json-schema": "^1.8.8",
    "@orpc/openapi": "^1.8.8",
    "@orpc/server": "^1.8.8",
    "@orpc/tanstack-query": "^1.8.8",
    "@orpc/zod": "^1.8.8",
    "zod": "^4",

```

## 2. Create the Server

oRPC has 2 main parts: server side, and a client.
Generally:

- the server implements the functions and manages the types on it's end.
- the client creates a client for the oRPC server and uses the types from there.

#### NOTE:

IN Next JS, we have SSR (Server Side Rendering) which enables the server to fetch the data before everything is sent to the user.
Inorder for it to work well with oRPC we'll introduce a server's client (see [Server-Side Client](#b-server-side-client))

### 2a. Create Route & Type

1. Define types with Zod v4,
1. Define the router (and logic inside)

- Create an `oRPC` folder in the `lib`/`utils` directory.
- in it create `server` folder
- in it create a `router` folder and a `schemas` folder

#### Defining Schema:

src/lib/oRPC/server/schemas/todo.ts

```typescript
import z from "zod";

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});

export type TodoSchemaType = z.infer<typeof TodoSchema>;
```

#### Defining Procedure

src/lib/oRPC/server/router/todo.ts

```typescript
import { ORPCError, os } from "@orpc/server";
import z from "zod";
import { TodoSchema, TodoSchemaType } from "../schemas/todo";

// In-memory storage for todos [Simplified DB]
let todos: TodoSchemaType[] = [
  {
    id: "1",
    title: "Sample Todo",
    description: "This is a sample todo item",
  },
  {
    id: "2",
    title: "Another Todo",
    description: "This is another sample todo",
  },
];
let nextId = 3;

// defining procedure:
export const createTodo = os
  .route({
    method: "POST",
    path: "/todos",
    summary: "Create a new todo item",
    tags: ["Todos"],
  })
  .input(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  )
  .output(TodoSchema)
  .handler(async ({ context, input }) => {
    console.log("createTodo", input);
    const todo: TodoSchemaType = {
      id: nextId.toString(),
      title: input.title,
      description: input.description,
    };

    todos.push(todo);
    nextId++;

    return todo;
  });

export const getTodos = os
  .route({
    method: "GET",
    path: "/todos",
    summary: "Get a list of todos",
    tags: ["Todos"],
  })
  .input(
    z.object({
      amount: z.number(),
    }),
  )
  .output(z.array(TodoSchema))
  .errors({
    FORBIDDEN: {
      message: "You are not authorized to do this",
      status: 403,
    },
  })
  .handler(async ({ context, input, errors }) => {
    console.log("getTodos", input);
    if (input.amount > 10) {
      // options 1:
      //   throw errors.FORBIDDEN();
      // options 2:
      throw new ORPCError("FORBIDDEN", {
        message: "You are not authorized to do this",
        status: 403,
      });
    }

    // Return the requested amount of todos, or all if amount is greater than available
    const result = todos.slice(0, input.amount);
    return result;
  });
```

## 2b. Create The router and wire it to endpoint

A router is responsible to direct the response to the right function call.

### Define Index file that exposes all of the routes inside of the routers' folder

src/lib/oRPC/server/router/index.ts

```typescript
import { me, signin, signup } from "./auth";
import { createTodo, getTodos } from "./todo";

export const router = {
  todo: {
    createTodo: createTodo,
    getTodos: getTodos,
  },
  auth: {
    signup: signup,
    signin: signin,
    me: me,
  },
};
```

#### We wire to an actual API Route:

/src/app/oRPC-test/rpc/[[...rest]]/route.ts
in Next Js syntax, it means that any route that follows localhost:3000/orpc-test/rpc/........ will be directed to this file. [see docs](https://nextjs.org/docs/pages/building-your-application/routing/api-routes#optional-catch-all-api-routes)

```typescript
import { router } from "@/lib/oRPC/server/router";
import { RPCHandler } from "@orpc/server/fetch";

const handler = new RPCHandler(router);

async function handleRequest(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: "/rpc",
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
```

[↑ Back to top](#table-of-contents)

## 3. Create Client(s)

We have 2 kind of clients.

#### A. The regualar main one which is the browser side client

this client is responsible to communicate from the user's device to the server

#### B. The Server-Side Client - for Server-Side Rendering

This is used so that the server be able to fetch data from itself before the page is sent to the user (saves time).

### A. Regular Main Client:

The client needs to communicate via the link the right route

In our `lib` folder, we'll create `clients` folder
and in it the BROWSER SIDE CLIENT

#### Define the contact point at the client's browser

/src/lib/oRPC/clients/orpc.ts

```typescript
import type { RouterClient } from "@orpc/server";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { router } from "@/lib/oRPC/server/router";

declare global {
  var $client: RouterClient<typeof router> | undefined;
}

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("RPCLink is not allowed on the server side.");
    }

    return `${window.location.origin}/oRPC-test/rpc`;
  },
});

/**
 * Fallback to client-side client if server-side client is not available. [server side is for SSR]
 */
export const client: RouterClient<typeof router> =
  globalThis.$client ?? createORPCClient(link);
```

[↑ Back to top](#table-of-contents)

## 4. Use oRPC Client in React client component

```typescript
"use client";

import { useState } from "react";
import { client } from "@/lib/oRPC/clients/orpc";

interface TodoFormValues {
  title: string;
  description: string;
}

export function SimpleTodoForm() {
  ...
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: TodoFormValues = {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
    };

    if (!values.title && !values.description) return;

    setIsSubmitting(true);
    try {
      // CALLING THE CLIENT HERE:
      await client.todo.createTodo(values);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      ...
    </div>
  );
}
```

### B. Server-side client

It is only relevant to projects with SSR frameworks, like Next Js, and it's optional. [video Explaining](https://youtu.be/uogRJKpAkUM?si=iJFO0-uACl-sRKWE&t=405)

#### step1: add global client (managed by [Regular Main Client](#a-regular-main-client))

src/lib/oRPC/clients/orpc.server.ts

```typescript
import { headers } from "next/headers";
import { createRouterClient } from "@orpc/server";
import { router } from "@/lib/oRPC/server/router";

globalThis.$client = createRouterClient(router, {
  context: async () => ({
    headers: await headers(),
  }),
});
```

#### Step 2: add a loading script: (must be Inside 'src/' folder)

/src/instrumentation.ts

```typescript
export async function register() {
  await import("./lib/oRPC/clients/orpc.server");
}
```

#### Step 3: add an import to the main layout.tsx

/src/app/layout.tsx

```typescript
import "../lib/orpc.server"; // for pre-rendering
```

usage in a sever componets:

```typescript
export default async function PlanetListPage() {
  const planets = await client.planet.list({ limit: 10 })

  return (
    <div>
      {planets.map(planet => (
        <div key={planet.id}>{planet.name}</div>
      ))}
    </div>
  )
}
```

[↑ Back to top](#table-of-contents)

---

## 5.Infer types from backend to frontend

With oRPC, Instead of defining types in a shared directory, or generating schemas and manage their syncronazation, we're able to infer types right from the API!

### 1. export ApiInputs & ApiOutputs

/src/lib/oRPC/clients/orpc.ts:

```typescript
import { router } from "@/lib/oRPC/server/router";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
export type ApiInputs = InferRouterInputs<typeof router>;
export type ApiOutputs = InferRouterOutputs<typeof router>;
```

### 2. use the types where-ever you need them:

```typescript
// What you were looking for:
export type TodoFormValues = ApiInputs["todo"]["createTodo"];

// Or if you want both input and output:
export type GetTodoTypes = {
  input: ApiInputs["todo"]["createTodo"];
  output: ApiOutputs["todo"]["createTodo"];
};
```

[↑ Back to top](#table-of-contents)

---

## 6. Error throwing

in oRPC there are 2 main ways to throw errors

1.  add your own custom errors
1.  use ORPC's typed erroring system ORPCError

### 2. use

```typescript
export const getTodos = os
  .route({
    method: "GET",
    path: "/todo/get",
    summary: "Get all todos",
    tags: ["Todo"],
  })
  .input(
    z.object({
      amount: z.number(),
    }),
  )
  .output(z.array(TodoSchema))
  .errors({
    // <-- option 1: add custom errors
    FORBIDDEN: {
      message: "You are not authorized to do this",
      status: 403,
    },
  })
  .handler(async ({ context, input, errors }) => {
    console.log("getTodos", input);
    if (input.amount > 10) {
      // options 1:
      //   throw errors.FORBIDDEN();
      // options 2:
      throw new ORPCError("FORBIDDEN", {
        message: "You are not authorized to do this",
        status: 403,
      });
    }

    // Return the requested amount of todos, or all if amount is greater than available
    const result = todos.slice(0, input.amount);
    return result;
  });
```

# Advanced Features

## 7. Using Middleware (Authentication)

Middleware in oRPC allows you to add common functionality like authentication, logging, or validation across multiple procedures.

### Creating Authentication Middleware

First, create a middleware file:

/src/lib/oRPC/middlewares/auth.ts

```typescript
import { ORPCError, os } from "@orpc/server";
import { User } from "../server/schemas/user";

export const requiredAuthMiddleware = os
  .$context<{ session?: { user?: User } }>()
  .middleware(async ({ context, next }) => {
    const session = context.session ?? (await getSession());

    if (!session.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({
      context: { user: session.user }, // <-- adding data to the context
    });
  });

async function getSession() {
  // Implement your actual session retrieval logic here (JWT, Database lookup..)
  return {
    user: {
      id: "user-id-from-token",
      name: "John Doe",
      email: "john@example.com",
    },
  };
}
// Create an authenticated version of os
export const authed = os.use(requiredAuthMiddleware);
```

### Using the Authentication Middleware

Now you can use the `authed` object instead of `os` for protected procedures:

/src/lib/oRPC/server/router/protected-todo.ts

```typescript
import { authed } from "../../middlewares/auth";
import z from "zod";
import { TodoSchema, TodoSchemaType } from "../schemas/todo";

// This procedure requires authentication
export const createProtectedTodo = authed // <- authed instead of os...
  .input(TodoInputSchema)
  .output(TodoSchema)
  .handler(async ({ context, input }) => {
    // context.user is now guaranteed to exist due to the middleware
    console.log("Creating todo for user:", context.user.name);

    const todo: TodoSchemaType = {
      id: Date.now().toString(),
      title: input.title,
      description: input.description,
      userId: context.user.id, // We can now safely access user data
    };

    // Your todo creation logic here
    return todo;
  });
```

See [middleware docs](https://orpc.unnoq.com/docs/middleware) for

- chaning middlewares
- lifecycle built-in middlewares (onStart etc.)
- map routing

## 8. Setting up OpenAPI Documentation with Scalar

### Make your app openAPI Cetrified requires 2 things:

**Step 1:** Route handlers (`.route()`) are required for OpenAPI/Scalar documentation generation. They define the HTTP method, path, summary, and tags for each procedure. [ Due it isn't required for regular rpc development]

**Step 2:** if we have errors throwing we must add status code (e.g 403) inorder to adhere to the openAPI spec too.

oRPC can automatically generate beautiful API documentation using OpenAPI and Scalar.

### Create OpenAPI Documentation Route [see docs](https://orpc.unnoq.com/docs/openapi/openapi-specification#common-schemas)

/src/app/oRPC-test/api/docs/[[...rest]]/route.ts

```typescript
import { router } from "@/lib/oRPC/server/router";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { experimental_SmartCoercionPlugin as SmartCoercionPlugin } from "@orpc/json-schema";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { NewUserSchema, UserSchema } from "@/lib/oRPC/server/schemas/user";
import {
  CredentialSchema,
  TokenSchema,
} from "@/lib/oRPC/server/schemas/auth";

const openAPIHandler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new SmartCoercionPlugin({
      // <-- converts to correct types automatically
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: {
          title: "CarWise API Documentation", // Your API title
          version: "1.0.0",
          description: "API documentation for CarWise application",
        },

        // Define reusable schemas
        commonSchemas: {
          NewUser: { schema: NewUserSchema },
          User: { schema: UserSchema },
          Credential: { schema: CredentialSchema },
          Token: { schema: TokenSchema },
          UndefinedError: { error: "UndefinedError" },
        },

        // Security configuration
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              description: "JWT Bearer token authentication",
            },
          },
        },
      },
      docsConfig: {
        authentication: {
          securitySchemes: {
            bearerAuth: {
              token: "your-default-token-here", // Default token for testing
            },
          },
        },
      },
    }),
  ],
});

async function handleRequest(request: Request) {
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/oRPC-test/api/docs/", // Must match your route path
    context: {},
  });

  return response ?? new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
```

### TODO: Show how to use it with React Query.

https://orpc.unnoq.com/docs/adapters/next

[↑ Back to top](#table-of-contents)
