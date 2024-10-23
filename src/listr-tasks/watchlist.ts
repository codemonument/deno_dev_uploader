import type {
    DefaultRenderer,
    Listr,
    ListrTaskWrapper,
    SimpleRenderer,
} from "listr2";
import {
    createSftpUploadTask,
    listrLogger,
    type ListrTopLvlCtx,
    type ListrWatcherCtx,
} from "../listr.ts";
import { SftpClient } from "@codemonument/sftp-client";
import type { IgnorePatterns, UploadPair } from "../types.ts";
import { watch } from "../watch.ts";
import { format } from "date-fns";
import { splitToNChunks } from "../utils.ts";

export type WatcherTasklistOptions = {
    watcherName: string;
    uploadPair: UploadPair;
    ignorePatterns: IgnorePatterns;
    sftp: {
        host: string;
        connections: number;
    };
};

/**
 * Generates a task list for the watcher for each uploadPair
 * @param parentTask The parent Listr2 task to generate the new Subtask list from
 */
export function generateWatcherTasklist(
    parentTask: ListrTaskWrapper<
        ListrTopLvlCtx,
        typeof DefaultRenderer,
        typeof SimpleRenderer
    >,
    { watcherName, sftp, uploadPair, ignorePatterns }: WatcherTasklistOptions,
) {
    return parentTask.newListr<ListrWatcherCtx>((watcherTask) => [
        // Watcher TaskList: Task 1
        {
            title: `${watcherName}: Create sftp connections to ${sftp.host}`,
            task: (ctx, task) => {
                // SFTP INFO
                // - source files are referenced from the cwd of this cli, for example:
                // -   dist/apps/myapp/assets/svg-icons/ms_access.svg
                task.output =
                    `Creating ${sftp.connections} SFTP connections...`;
                for (let j = 0; j < sftp.connections; j++) {
                    ctx.sftp[j] = new SftpClient({
                        host: sftp.host,
                        cwd: Deno.cwd(),
                        uploaderName: `${ctx.watcherName}_sftp_${j + 1}`,
                        logger: listrLogger,
                        // logMode: "unknown-and-error",
                        logMode: "verbose",
                    });
                }
            },
        },
        // Watcher TaskList: Task 2
        {
            title: `${watcherName}: Remote cd to '${uploadPair.destination}'`,
            task: async (ctx, _task) => {
                for (let j = 0; j < sftp.connections; j++) {
                    // CAUTION: the destination folder MUST exist on the server! Upload WILL fail otherwise!
                    // TODO: add ensureDir functionality for sftp (same as mkdir -p)
                    // await ctx.sftp[j].cd(
                    //     uploadPair.destination,
                    // );
                    try {
                        await ctx.sftp[j].cd(
                            uploadPair.destination,
                        );
                    } catch (error) {
                        listrLogger.error(
                            `Could not cd to ${uploadPair.destination} on SFTP${
                                j + 1
                            }!`,
                            error,
                        );
                    }
                }
            },
        },
        // Watcher TaskList: Task 3
        {
            title: `${watcherName}: Starting watcher for ${uploadPair.source}`,
            task: (ctx, task) => {
                const watcher$ = watch({
                    watcherName,
                    watchDir: uploadPair.source,
                    logger: listrLogger,
                    ignore: ignorePatterns,
                });

                watcher$.subscribe((allChangedFiles) => {
                    const dateString = format(
                        new Date(),
                        "yyyy-mm-dd HH:mm:ss:SSS",
                    );
                    listrLogger.info(
                        `${dateString} Changed files: ${allChangedFiles.length}`,
                    );

                    // slice files into n buckets
                    const fileBuckets = splitToNChunks(
                        allChangedFiles,
                        sftp.connections,
                    );

                    // returns a new task list inside this "start watcher" task
                    return task.newListr((parentTask) => [
                        {
                            title:
                                `${dateString} Changes detected: Uploading ${allChangedFiles.length} files`,
                            task: (ctx, task): Listr =>
                                task.newListr((
                                    _parentTask,
                                ) => fileBuckets.map(
                                    (bucket, index) => {
                                        return createSftpUploadTask(
                                            ctx.sftp[index],
                                            bucket,
                                            `SFTP${index + 1}`,
                                        );
                                    },
                                )),
                        },
                    ]);
                });
            },
        },
    ], {
        ctx: {
            watcherName,
            sftp: [],
        },
    });
}
