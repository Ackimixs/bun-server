import {ServerWebSocket, WebSocketHandler} from "bun";
import {MyDb} from "@root/myDb.ts";

export function websocket(db: MyDb): WebSocketHandler<{ id: string }> {

    async function open(ws: ServerWebSocket<{ id: string }>) {
        console.log("Connection opened");
    }

    function close(ws: ServerWebSocket<{ id: string }>) {
        console.log("Connection closed");
    }

    async function message(ws: ServerWebSocket<{ id: string }>, message : string) {
        console.log("Message received: " + message);
    }

    async function drain(ws: ServerWebSocket<{ id: string }>) {
        console.log("Drain received");
    }

    return {
        open,
        close,
        message,
        drain
    }
}