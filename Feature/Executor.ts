import { extractVariables } from "../Step/Expression";
import { IStep } from "../Step/Step";
import { Log } from "../Utils/Log";
import { measureMiliseconds } from "../Utils/Time";
import { IScenario, IFeature } from "./Loader";

export enum OutcomeStatus {
    Ok = 1,
    Warning = 2,
    Error = 4,
    Skipped = 8
}

interface IStepOutcome {
    step: IStep;
    status: OutcomeStatus;
    error?: Error;
    durationMs: number;
}

interface IScenarioOutcome {
    scenario: IScenario;
    status: OutcomeStatus;
    stepOutcomes: IStepOutcome[];
}

export interface IFeatureOutcome {
    feature: IFeature;
    status: OutcomeStatus;
    scenarioOutcomes: IScenarioOutcome[];
    error?: Error;
}

async function runWithTimeout(timeoutMS: number, runFn: () => Promise<any>, onTimeoutError: string) {
    return new Promise((resolve, reject) => {
        runFn().then(resolve).catch(reject);

        setTimeout(() => reject(onTimeoutError), timeoutMS);
    });
}

export async function executeFeature(feature: IFeature) {
    const context = { variables: {} };
    const featureOutcome: IFeatureOutcome = {
        feature,
        status: OutcomeStatus.Ok,
        scenarioOutcomes: []
    }

    for (let i = 0; i < feature.scenarios.length; i++) {
        const scenario = feature.scenarios[i];
        const scenarioOutcome: IScenarioOutcome = {
            scenario,
            status: OutcomeStatus.Ok,
            stepOutcomes: []
        }

        featureOutcome.scenarioOutcomes.push(scenarioOutcome);

        const stepList: IStep[] = [...feature.backgroundSteps, ...scenario.steps];

        for (let j = 0; j < stepList.length; j++) {
            const step = stepList[j];
            const stepOutcome: IStepOutcome = {
                step,
                status: OutcomeStatus.Ok,
                durationMs: 0
            };

            scenarioOutcome.stepOutcomes.push(stepOutcome);

            const variables = extractVariables(step);
            process.stdout.clearLine(undefined);
            process.stdout.cursorTo(0);
            process.stdout.write("Executing - Scenario: " + scenario.name + ` Step (${j + 1}/${stepList.length - 1}): ` + step.name);

            const { timeoutMS } = step.definition.options;
            try {
                stepOutcome.durationMs = await measureMiliseconds(async () => {
                    await runWithTimeout(timeoutMS, async () => {
                        await step.definition.cb.apply(context, variables);
                    }, `Timeout after ${timeoutMS} milliseconds.`);
                });
            } catch (ex) {
                featureOutcome.status = scenarioOutcome.status = stepOutcome.status = OutcomeStatus.Error;
                featureOutcome.error = stepOutcome.error = ex;

                /** Skip remaining steps */
                stepList.slice(j + 1).forEach(e => scenarioOutcome.stepOutcomes.push({
                    status: OutcomeStatus.Skipped,
                    step: e,
                    durationMs: 0
                }));

                break;
            }
        }
    }

    return featureOutcome;
}