import * as Express from "express";
import { executeStep } from "../Feature/Executor";
import { IFeature, loadFeature } from "../Feature/Loader";
import { IRunnerOptions, requireScripts } from "../Runner";
import { IStep, stepDefinitions } from "../Step/Step";
import { queryFiles } from "../Utils/QueryFiles";

export function getApiRouter(feature: IFeature, options: IRunnerOptions) {
    const router = Express.Router();
    const context = { variables: {} };

    router.get("/feature", (req, res) => {
        res.send(feature);
    });

    router.post("/reload", async (req, res) => {
        const stepDefinitionNames = await queryFiles(options.scriptsPath);

        requireScripts(stepDefinitionNames);
        feature = await loadFeature(options.featureFullPath);
        res.sendStatus(200);
    });

    router.get("/feature/variables", (req, res) => {
        res.send(context.variables);
    });

    router.post("/feature/variables", (req, res) => {
        if (typeof req.body.variables !== "object")
            res.sendStatus(400);

        context.variables = Object.assign({}, context.variables, req.body.variables);
        res.sendStatus(200);
    });

    let lastScenarioId: number = null;

    router.post("/scenario/:scenarioId/step/:stepId", async (req, res) => {
        const scenarioId = Number(req.params.scenarioId);

        if (scenarioId !== lastScenarioId) {
            context.variables = {};
            lastScenarioId = scenarioId;
        }

        const stepId = Number(req.params.stepId);
        const scenario = feature.scenarios.find(e => e.id === scenarioId);
        if (!scenario)
            return res.sendStatus(404);

        const step: IStep = feature.backgroundSteps.find(e => e.id === stepId) || scenario.steps.find(e => e.id === stepId);
        if (!step)
            return res.sendStatus(404);

        const stepOutcome = await executeStep(step, context);

        if (stepOutcome.error)
            console.log(stepOutcome.error);

        return res.send({ status: stepOutcome.status, error: stepOutcome.error?.stack });
    });

    return router;
}
