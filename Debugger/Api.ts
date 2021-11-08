import * as Express from "express";
import { executeStep } from "../Feature/Executor";
import { IFeature, loadFeature } from "../Feature/Loader";
import { IRunnerOptions } from "../Runner";
import { IStep } from "../Step/Step";

export function getApiRouter(feature: IFeature, options: IRunnerOptions) {
    const apiRouter = Express.Router();

    const context = { variables: {} };

    apiRouter.get("/feature", (req, res) => {
        res.send(feature);
    });

    apiRouter.post("/feature/reload", async (req, res) => {
        feature = await loadFeature(options.featureFullPath);
        res.send(feature);
    });

    apiRouter.get("/feature/variables", (req, res) => {
        res.send(context.variables);
    });

    apiRouter.post("/feature/variables", (req, res) => {
        if (typeof req.body.variables !== "object")
            res.sendStatus(400);

        context.variables = Object.assign({}, context.variables, req.body.variables);
        res.sendStatus(200);
    });

    apiRouter.post("/scenario/:scenarioId/step/:stepId", async (req, res) => {
        const scenarioId = Number(req.params.scenarioId);
        const stepId = Number(req.params.stepId);

        const scenario = feature.scenarios.find(e => e.id === scenarioId);
        if (!scenario)
            return res.sendStatus(404);

        const step: IStep = feature.backgroundSteps.find(e => e.id === stepId) || scenario.steps.find(e => e.id === stepId);
        if (!step)
            return res.sendStatus(404);

        const stepOutcome = await executeStep(step, context);

        return res.send({ status: stepOutcome.status });
    });

    return apiRouter;
}
