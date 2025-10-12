import { ORPCError, os } from "@orpc/server";
import z from "zod";
import { TodoSchema, TodoSchemaType } from "../schemas/todo";
import { authed } from "../../middlewares/auth";

// In-memory storage for todos
const todos: TodoSchemaType[] = [
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

export const createTodo = os
  .route({
    method: "POST",
    path: "/todo",
    summary: "Create a new todo",
    tags: ["Todo"],
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

//   import { ORPCError, os } from "@orpc/server";
// import z from "zod";
// import { TodoSchema } from "../schemas/todo";
// // import prisma from "@/lib/db";
// import { authed } from "../../middlewares/auth";

// export const createTodo = authed
//   .input(
//     z.object({
//       title: z.string(),
//       description: z.string(),
//     }),
//   )
//   .output(TodoSchema)
//   .handler(async ({ context, input }) => {
//     const todo = await prisma.todo.create({
//       data: {
//         title: input.title,
//         description: input.description,
//       },
//     });

//     return todo;
//   });

// export const getTodos = authed
//   .input(
//     z.object({
//       amount: z.number(),
//     }),
//   )
//   .output(z.array(TodoSchema))
//   .errors({
//     FORBIDDEN: {
//       message: "You are not authorized to do this",
//       status: 403,
//     },
//   })

//   .handler(async ({ context, input, errors }) => {
//     if (input.amount > 10) {
//       throw errors.FORBIDDEN();
//     }

//     const todos = await prisma.todo.findMany();

//     return todos;
//   });
