import {myRequest, myResponse} from "@root/utils/type.ts";

export function apiRouteHandler(req: myRequest, res: myResponse) {

    res.status(200).statusText("success").json({status: 200, statusText: "success", body: {time: Date.now()}});

}
