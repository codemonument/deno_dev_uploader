import { Manager } from "@listr2/manager";
import { type ListrBaseClassOptions, ListrLogger } from "npm:listr2";
import type { GenericLogger, SftpClient } from "@codemonument/sftp-client";

export type ListrCtx = {
    sftp: Array<SftpClient>;
};

export function createListrManager<T = unknown>(
    override?: ListrBaseClassOptions,
): Manager<T> {
    return new Manager({
        concurrent: true,
        exitOnError: false,
        rendererOptions: {
            collapseSubtasks: false,
            collapseSkips: false,
        },
        ctx: {
            sftp: [],
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
