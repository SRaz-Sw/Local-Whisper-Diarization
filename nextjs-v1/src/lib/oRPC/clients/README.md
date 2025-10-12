# oRPC has 2 "clients" in Next Js.

see video: https://youtu.be/uogRJKpAkUM?si=4IndAHlCNpWcatBI&t=386

## 1. Client side client - fetches from the user's browser

file is client/nextjs-v1/src/lib/oRPC/client/orpc.ts

the actual frontend (user's browser) making request back to the server.

## 2. Server Side client - fetches from the server before the initial response is sent to the client's browser.

(For SSR - Server Side Rendering)

file is in : client/nextjs-v1/src/lib/oRPC/clients/orpc.server.ts
