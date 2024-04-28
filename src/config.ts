import {GlobalConfig} from "@root/utils/type.ts";

export const Config : GlobalConfig = {
    folder: {
        api: "src/server/api",
        public: "src/public",
        middleware: "src/server/middleware",
        pages: "src/page",
        database: "src/database",
    },
    port: Bun.env.PORT ?? 8080,
}