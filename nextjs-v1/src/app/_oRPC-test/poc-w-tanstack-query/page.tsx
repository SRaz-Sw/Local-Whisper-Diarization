"use client";

import { useQuery } from "@tanstack/react-query";
import { TanstackForm } from "./_components/tanstack-form";
import { orpc } from "@/lib/oRPC/clients/orpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const query = useQuery(
    orpc.todo.getTodos.queryOptions({
      input: { amount: 5 }, // Specify input if needed
    }),
  );
  return (
    <main className="mt-36 flex min-h-screen w-full flex-col items-center">
      <TanstackForm />

      <div className="mt-12 grid w-full grid-cols-1 gap-4 px-10 md:grid-cols-2 lg:grid-cols-3">
        {query.data?.map((todo) => (
          <Card key={todo.id}>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                Rendered below after submit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-muted-foreground text-sm">
                  Title
                </span>
                <p className="font-medium">{todo.title}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">
                  Description
                </span>
                <p className="whitespace-pre-wrap">{todo.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
