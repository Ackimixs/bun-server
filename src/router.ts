import fs from "node:fs";
import path from "node:path";
import {Server, WebSocketHandler, BunFile} from "bun";
import {MyDb} from "@root/myDb.ts";
import * as process from "process";
import {watch, WatchEventType} from "fs";
import {GlobalConfig, myRequest, myResponse, RouteOptions} from "@root/utils/type.ts";
import {findAndRemoveValueInMap, findValueInMap, matchSpecialRoute} from "@root/utils/function.ts"

export class Router {
    routes: Map<{path: string, method: string}, {callback: (req: myRequest, res: myResponse, options?: { [key: string]: any }) => Promise<void>, options?: RouteOptions}>;
    middleware: {path: string, middlewareHandler: (req: Request, res: myResponse, options?: { [key: string]: any }) => Promise<{middlewareResponseStatus: number, response?: Response}>}[] = [];
    ws: {path: string[], websocket: WebSocketHandler<{ id: string }> | undefined};
    templateFileHTML: BunFile;
    config: GlobalConfig;

    constructor(config: GlobalConfig) {
        this.routes = new Map<{path: string, method: string}, {callback: (req: myRequest, res: myResponse, options?: { [key: string]: any }) => Promise<void>, options?: RouteOptions}>();
        this.middleware = [];
        this.ws = {path: [], websocket: undefined};
        this.templateFileHTML = Bun.file("./src/private/template.html");
        this.config = config;
    }

    addRoute(path: string, method: string, handler: (req: myRequest, res: myResponse) => Promise<void>, options?: RouteOptions) {
        this.routes.set({path, method}, {callback: handler, options});
    }

    async handle(req: Request, res: myResponse, server: Server, options?: { [p: string]: any }) {
        await this.handleWebSocket(req, res, server, options);
        if (res.isReady()) {
            return;
        }

        const url = new URL(req.url);

        const path = url.pathname;
        for (const middleware of this.middleware) {
            if (path.match(middleware.path)) {
                await middleware.middlewareHandler(req, res, options);

                if (res.isReady()) {
                    return;
                }
            }
        }

        let handler = findValueInMap(this.routes, {path: url.pathname, method: req.method});
        if (!handler) handler = findValueInMap(this.routes, {path: url.pathname, method: "ALL"});
        if (handler && handler.callback) {
            const r = new myRequest(req);
            if (req.body) r.jsonData = await req.json();

            await handler.callback(r, res, options);

            if (res.isReady()) {
                return;
            }
        } else {
            // Check for special routes like :id
            for (const [specialRoute, v] of this.routes) {
                if (matchSpecialRoute(specialRoute.path, url.pathname)) {
                    if (specialRoute.method === req.method || specialRoute.method === "ALL") {
                        const r = new myRequest(req);
                        specialRoute.path.split("/").forEach((segment, index) => {
                            if (segment.startsWith(":")) {
                                r.params[segment.slice(1)] = url.pathname.split("/")[index];
                            }
                        });
                        if (req.body) r.jsonData = await req.json();

                        await v.callback(r, res, options);

                        if (res.isReady()) {
                            return res;
                        }
                    }
                }
            }
        }
    }

    async handleWebSocket(req: Request, res: myResponse, server: Server, options?: { [key: string]: any }) {
        const url = new URL(req.url);
        const path = url.pathname;

        if (this.ws.websocket && this.ws.path.some(p => path.match(p))) {
            const success = server.upgrade(req, {data: options});
            success
                ? res.status(101).send("WebSocket upgrade successful")
                : res.status(400).send("WebSocket upgrade failed");
        }
    }

    addWebsocketPath(path: string) {
        this.ws.path.push(path);
    }

    async initialize() {
        const middlewareFiles = this.getAllFiles(this.config.folder?.middleware ?? "./src/server/middleware", []);

        for (const middlewareFile of middlewareFiles) {
            const fullPath = path.join(process.cwd(), middlewareFile);
            const middleware = await import(fullPath);

            this.middleware.push(middleware.middleware);
        }

        const apiFiles = this.getAllFiles(this.config.folder?.api ?? "./src/server/api", []);

        for (const apiFile of apiFiles) {
            await this.addApiRouteWithFile(apiFile);
        }

        const pagesFiles = this.getAllFiles(this.config.folder?.pages ?? "./src/page", []);

        // TODO do special route for file (i have not idea how to did it yet) like [id].ts

        for (const pageFile of pagesFiles) {
            await this.createPageFile(pageFile);
        }

        const publicFiles = this.getAllFiles(this.config.folder?.public ?? "./src/public", []);

        for (const publicFile of publicFiles) {
            const fullPath = path.join(process.cwd(), publicFile);
            const file = Bun.file(fullPath);
            let p = "/" + path.dirname(publicFile).split(path.sep).slice(1).join("/") + "/" + path.basename(publicFile);

            this.addRoute(p, "GET", async (req: myRequest, res: myResponse) => {
                res.status(200).send(file);
            });
        }

        if (fs.existsSync("./src/server/websocket.ts")) {
            const fullPath = path.join(process.cwd(), "./src/server/websocket.ts");
            const websocket = await import(fullPath);

            this.ws.websocket = websocket.websocket(MyDb);
        }
    }

    getAllFiles(dirPath: string, filesArray: string[]): string[] {
        if (!fs.existsSync(dirPath)) {
            return [];
        }

        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const fileStat = fs.statSync(filePath);

            if (fileStat.isDirectory()) {
                this.getAllFiles(filePath, filesArray);
            } else {
                filesArray.push(filePath);
            }
        });

        return filesArray;
    }

    get(path: string, handler: (req: myRequest, res: myResponse) => Promise<void>) {
        this.addRoute(path, "GET", handler);
    }

    post(path: string, handler: (req: myRequest, res: myResponse) => Promise<void>) {
        this.addRoute(path, "POST", handler);
    }

    put(path: string, handler: (req: Request, res: myResponse) => Promise<void>) {
        this.addRoute(path, "PUT", handler);
    }

    delete(path: string, handler: (req: Request, res: myResponse) => Promise<void>) {
        this.addRoute(path, "DELETE", handler);
    }

    patch(path: string, handler: (req: Request, res: myResponse) => Promise<void>) {
        this.addRoute(path, "PATCH", handler);
    }

    async addApiRouteWithFile(apiFile: string) {
        const method = path.basename(apiFile).split(".").length === 3 ? path.basename(apiFile).split(".")[1].toUpperCase() : "ALL" || "ALL";
        let p = "/" + path.dirname(apiFile).split(path.sep).slice(2).join("/") + "/" + path.basename(apiFile).split(".")[0];
        const fullPath = path.join(process.cwd(), apiFile);

        p = p.split("/").map(segment => segment.startsWith("[") && segment.endsWith("]") ? ":" + segment.slice(1, -1) : segment).join("/");

        const handler = await import(fullPath);
        this.routes.set({path: p, method}, {callback: handler.apiRouteHandler, options: {isFile: true, filePath: apiFile}});

        const watcher = watch(apiFile, async (event, filename) => {
            // console.log(`File ${filename} has been ${event}d`);
            if (event === "change") {
                delete require.cache[require.resolve(fullPath)];

                const newHandler = await import(fullPath);
                findAndRemoveValueInMap(this.routes, {path: p, method});
                this.routes.set({path: p, method}, {callback: newHandler.apiRouteHandler, options: {isFile: true, filePath: apiFile}});
            } else if (event === "rename" && filename) {
                findAndRemoveValueInMap(this.routes, {path: p, method});
                await this.updateApiFile();
                watcher.close();
            }
        });
    }

    async createPageFile(pageFile: string) {
        const fullPath = path.join(process.cwd(), pageFile);
        let p = "/" + path.dirname(pageFile).split(path.sep).slice(2).join("/") + "/" + path.basename(pageFile).split(".")[0];
        const text = await Bun.file(fullPath).text();

        if (p.endsWith("index")) {
            p = p.slice(0, p.length - 6);
        }

        this.addRoute(p, "GET", async (req: myRequest, res: myResponse) => {
            if (req.headers.get("accept") === "raw/html") {
                res.status(200).send(await Bun.file(fullPath).text());
                return;
            }

            const rewriter = new HTMLRewriter().on("body", {
                async element(elem) {
                    elem.append(text, { html: true });
                },
            });

            const baseResponse = new Response(this.templateFileHTML, { headers: { "Content-Type": "text/html" } });

            res.status(200).sendHtml(await rewriter.transform(baseResponse).text());
        }, {isFile: true, filePath: pageFile});

        const watcher = watch(pageFile, async (event, filename) => {
            if (event === "rename" && filename) {
                findAndRemoveValueInMap(this.routes, {path: p, method: "GET"});
                await this.createPageFile(filename);
                watcher.close();
            }
        });
    }

    async updateApiFile() {
        const apiFiles = this.getAllFiles("./src/server/api", []);

        for (const apiFile of apiFiles) {

            let isAlreadyAdded = false;

            for (const [key, value] of this.routes) {
                if (value.options?.isFile && value.options.filePath === apiFile) {
                    isAlreadyAdded = true;
                }
            }

            if (!isAlreadyAdded) {
                console.log("Adding new route: ", apiFile);

                await this.addApiRouteWithFile(apiFile);
            }

        }
    }

    handleFileChange(event: WatchEventType, filename: string | null) {
    }
}
