import {Server} from 'bun';
import {Router} from "@root/router.ts";
import {GlobalConfig, myRequest, myResponse} from '@root/utils/type.ts';
import {MyDb} from "@root/myDb.ts";
import {Config} from "@root/config.ts";
import {watch} from "fs";
import {isSubPath} from "@root/utils/function.ts";

export class MyServer {
    database: MyDb;
    server: Server | null = null;
    router: Router;
    config: GlobalConfig;

    constructor(config?: GlobalConfig) {
        this.config = {...config, ...Config};
        this.router = new Router(this.config);
        this.database = new MyDb(this.config);
    }

    async init() {
        await this.router.initialize();
        await this.database.initialize();

        watch("src", {recursive: true}, async (event, filename) => {
            this.router.handleFileChange(event, filename);

            if (event === "change" && filename?.endsWith("Models.json") && await Bun.file( "src/" + filename).exists()) {
                await this.database.updateModels();
            }
        })

    }

    start() {

        const fetch = async (req: myRequest, server: Server) => {
            let res: myResponse = new myResponse();

            await this.router.handle(req, res, server, {db: this.database});

            if (res.isReady()) {
                return res.end();
            } else {
                return res.status(404).statusText("Not found").json({status: 404, statusText: "Not found"}).end();
            }
        }

        const websocket = this.router.ws.websocket;

        this.server = Bun.serve({
            port: this.config.port,
            fetch,
            websocket,
        });

        console.log(`Listening on ${this.server.hostname}:${this.server.port}`);
    }
}