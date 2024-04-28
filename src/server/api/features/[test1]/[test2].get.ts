import {myRequest, myResponse} from "@root/utils/type.ts";

export async function apiRouteHandler(req: myRequest, res: myResponse) {

    res.status(200).statusText("success").json({status: 200, statusText: "success", body: {params: req.params}});

}