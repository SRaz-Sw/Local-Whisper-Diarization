import { SimpleTodoForm } from "./components/demo";
import { DemoNodeServer } from "./components/demo_node_server";
// import { useState } from "react";
// import {client} from "@/lib/oRPC/clients/orpc";

export default function TestORPCPage() {
  // const [currentTodos, setCurrentTodos] = useState<TodoSchemaType[]>([]);
  return (
    <div>
      {/* <SimpleTodoForm /> */}
      <DemoNodeServer />
    </div>
  );
}
