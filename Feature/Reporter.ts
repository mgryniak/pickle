import { Log, LogColor } from "../Utils/Log";
import { IFeatureOutcome, OutcomeStatus } from "./Executor";

function statusToSymbol(status: OutcomeStatus) {
    switch (status) {
        case OutcomeStatus.Ok:
            return Log.color(LogColor.FgGreen, "✔");
        case OutcomeStatus.Warning:
            return Log.color(LogColor.FgYellow, "⚠");
        case OutcomeStatus.Error:
            return Log.color(LogColor.FgRed, "✘");
        case OutcomeStatus.Skipped:
            return Log.color(LogColor.FgYellow, "?");
    }
}

function logDuration(durationMs: number) {
    const hours = Math.floor(durationMs / 3600000);
    durationMs -= hours * 3600000;

    const minutes = Math.floor(durationMs / 60000);
    durationMs -= minutes * 60000;

    const seconds = Math.floor(durationMs / 1000);
    durationMs -= seconds * 1000;

    const logParts: string[] = [];

    if (hours > 0)
        logParts.push(`${hours}h`);

    if (minutes > 0)
        logParts.push(`${minutes}m`);

    if (seconds > 0)
        logParts.push(`${seconds}s`);

    logParts.push(`${durationMs}ms`);

    return logParts.join(" ");
}

export async function reportFeature(featureOutcome: IFeatureOutcome) {
    console.log();
    Log.info(Log.color(LogColor.FgWhite, `=====${"=".repeat(featureOutcome.feature.name.length)}=====`));
    Log.info(Log.color(LogColor.FgWhite, `=====${Log.color(LogColor.FgYellow, featureOutcome.feature.name)}=====`));
    Log.info(Log.color(LogColor.FgWhite, `=====${"=".repeat(featureOutcome.feature.name.length)}=====`));

    let count: { [key: number]: number } = { [OutcomeStatus.Ok]: 0, [OutcomeStatus.Error]: 0, [OutcomeStatus.Warning]: 0, [OutcomeStatus.Skipped]: 0 };
    let totalDurationMs = 0;
    for (const scenarioOutcome of featureOutcome.scenarioOutcomes) {
        Log.info(`  ${statusToSymbol(scenarioOutcome.status)}  ${Log.color(LogColor.FgMagenta, scenarioOutcome.scenario.name)}`);

        for (const stepOutcome of scenarioOutcome.stepOutcomes) {
            totalDurationMs += stepOutcome.durationMs;
            count[stepOutcome.status]++;
            Log.info(`    ${statusToSymbol(stepOutcome.status)}  ${stepOutcome.step.name}  ${Log.color(LogColor.FgYellow, logDuration(stepOutcome.durationMs))}`);
            if (stepOutcome.status === OutcomeStatus.Error) {
                for (const stack of stepOutcome.error.stack.split("\n"))
                    Log.error(`        ${stack}`);
            }

        }
    }

    const total = Object.values(count).reduce((p, c) => p + c, 0);
    const percentage = count[OutcomeStatus.Ok] * 100 / total;
    const resultString = `Passed steps: ${count[OutcomeStatus.Ok]}/${total} (${Math.round(percentage)}%) ${Log.color(LogColor.FgYellow, logDuration(totalDurationMs))}`;
    Log.info("_".repeat(resultString.length));
    Log.info(resultString);

    console.log("\n\n");
}