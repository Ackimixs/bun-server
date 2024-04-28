import {myRequest, myResponse} from "@root/utils/type.ts";
import {MyDb} from "@root/myDb.ts";

export function apiRouteHandler(req: myRequest, res: myResponse, options: { db : MyDb }) {

    const body = req.jsonData;

    if (!body.price && !body.name) return res.status(400).statusText("Bad request").json({status: 400, statusText: "Bad request"}).end();

    const article = options.db.create("article", ["name", "price"], [body.name, body.price]);

    console.log(article);

    res.status(200).statusText("success").json({status: 200, statusText: "success", article});
}