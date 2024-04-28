import {myRequest, myResponse} from "@root/utils/type.ts";
import {MyDb} from "@root/myDb.ts";

export function apiRouteHandler(req: myRequest, res: myResponse, options: { db : MyDb }) {

    const { jsonData } = req;

    if (!jsonData.price && !jsonData.name) return res.status(400).statusText("Bad request").json({status: 400, statusText: "Bad request"}).end();

    const article = options.db.update("article", ["name", "price"], [jsonData.name, jsonData.price], `id = ${req.params.id}`);

    res.status(200).statusText("success").json({status: 200, statusText: "success", article});

}