export interface RouteOptions {
    isFile?: boolean;
    filePath?: string;
}

export interface GlobalConfig {
    folder?: {
        api?: string;
        public?: string;
        middleware?: string;
        pages?: string;
        database?: string;
    }

    port?: string | number;
}

export class myRequest extends Request {
    params: { [key: string]: string } = {};
    jsonData: any = {};
}

export class myResponse {
    response: Response;
    options: ResponseInit;

    constructor(response?: Response, options?: ResponseInit) {
        this.response = response ?? new Response();
        this.options = options ?? {};
    }

    status(status: number) {
        this.options.status = status;
        return this;
    }

    statusText(statusText: string) {
        this.options.statusText = statusText;
        return this;
    }

    json(body: any) {
        this.response = Response.json(body, this.options);
        return this;
    }

    send(body: any) {
        this.response = new Response(body, this.options);
        return this;
    }

    sendHtml(body: any) {
        this.response = new Response(body, {headers: {"Content-Type": "text/html"}, ...this.options});
        return this;
    }

    end() {
        return this.response;
    }

    isReady() {
        return this.response.body != null;
    }
}