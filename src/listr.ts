import { Manager } from "@listr2/manager";
import {
    type DefaultRenderer,
    type ListrBaseClassOptions,
    ListrLogger,
    type ListrTaskWrapper,
    type SimpleRenderer,
} from "npm:listr2";
import type { GenericLogger, SftpClient } from "@codemonument/sftp-client";
import { finalize, map } from "rxjs";
import { roundToPrecision } from "@codemonument/simple-rounding";

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

/**
 * Creates a listr task for each SFTP Process per watcher emit
 * @param sftp
 * @param files
 * @param uploaderName
 * @returns
 */
function createSftpUploadTask(
    sftp: SftpClient,
    files: string[],
    uploaderName: string,
) {
    return (
        _ctx: ListrCtx,
        task: ListrTaskWrapper<
            any,
            typeof DefaultRenderer,
            typeof SimpleRenderer
        >,
    ) => {
        const start = performance.now();
        const fileList = files;
        return sftp.uploadFiles$(fileList).pipe(
            map(({ file, nr }) => `Uploading file ${nr}: ${file}`),
            finalize(() => {
                const end = performance.now();
                const durationInSek = roundToPrecision((end - start) / 1000, 2);
                const text =
                    `${uploaderName}: Uploaded ${fileList.length} files in ${durationInSek} seconds!`;
                task.title = text;
            }),
        );
    };
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
