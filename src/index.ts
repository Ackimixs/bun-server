import {MyServer} from "@root/server.ts";

const server = new MyServer();

await server.init();

server.router.addWebsocketPath("/ws");

server.start();