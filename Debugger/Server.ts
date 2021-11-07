import * as Express from "express";
import * as Path from "path";
import { IFeature } from "../Feature/Loader";
import { Log } from "../Utils/Log";
import { getApiRouter } from "./Api";

export function startDebugger(port = 3001, feature: IFeature) {
    const server = Express();

    server.use(Express.static(Path.join(__dirname, "./Public")));

    server.use("/api", getApiRouter(feature));

    server.get("*", (req, res) => {
        res.sendFile(Path.join(__dirname, "./Public/Index.html"));
    });

    server.on("error", (err) => {
        Log.error(err);
    });

    server.listen(port, () => {
        Log.info(`Navigate to http://localhost:${port}/`);
    });
}
