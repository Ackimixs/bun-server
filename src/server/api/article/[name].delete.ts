import {myRequest, myResponse} from "@root/utils/type.ts";
import {MyDb} from "@root/myDb.ts";

export function apiRouteHandler(req: myRequest, res: myResponse, options: { db : MyDb }) {

    const article = options.db.delete("article", `id = ${req.params.id}`);

    res.status(200).statusText("success").json({status: 200, statusText: "success", article});

}