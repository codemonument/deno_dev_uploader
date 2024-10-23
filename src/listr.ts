import type { GenericLogger } from "@codemonument/sftp-client";
import { Manager } from "@listr2/manager";
import { type ListrBaseClassOptions, ListrLogger } from "npm:listr2";
import type { WatcherDefinition } from "./types.ts";

export type ListrTopLvlCtx = {
    watchers: Array<WatcherDefinition>;
};

export function createListrManager<T = unknown>(
    override?: ListrBaseClassOptions,
) {
    return new Manager<T>({
        concurrent: false,
        exitOnError: false,
        rendererOptions: {
            collapseSubtasks: false,
            collapseSkips: false,
        },
        ctx: {
            watchers: [],
        },
        ...override,
    });
}

const internalListrLogger = new ListrLogger({
    useIcons: false,
});

/**
 * TODO: Fix loosing the extras!
 */
export const listrLogger: GenericLogger = {
    log: (message: string, ...extras) =>
        internalListrLogger.log("info", message),
    info: (message: string, ...extras) =>
        internalListrLogger.log("info", message),
    warn: (message: string, ...extras) =>
        internalListrLogger.log("warn", message),
    error: (message: string, ...extras) =>
        internalListrLogger.log("error", message),
    debug: (message: string, ...extras) =>
        internalListrLogger.log("debug", message),
};
