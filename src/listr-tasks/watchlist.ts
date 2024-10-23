import { SftpClient } from "@codemonument/sftp-client";
import type { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import { listrLogger, type ListrTopLvlCtx } from "../listr.ts";
import type { WatcherDefinition } from "../types.ts";
import { watch } from "../watch.ts";

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
    topLvlCtx: ListrTopLvlCtx,
    newWatcher: WatcherDefinition,
) {
    const { watcherName, sftpOptions, uploadPair, ignorePatterns } = newWatcher;

    return parentTask.newListr((watcherTask) => [
        // Watcher TaskList: Task 1
        {
            title:
                `${watcherName}: Create sftp connections to ${sftpOptions.host}`,
            task: (ctx, task) => {
                // SFTP INFO
                // - source files are referenced from the cwd of this cli, for example:
                // -   dist/apps/myapp/assets/svg-icons/ms_access.svg
                task.output =
                    `Creating ${sftpOptions.connections} SFTP connections...`;

                if (newWatcher.state !== "startup") {
                    throw new Error(
                        `Cannot setup watcher "${watcherName}": state is not "startup", but "${newWatcher.state}" instead!`,
                    );
                }

                if (newWatcher.sftp === undefined) {
                    newWatcher.sftp = [];
                }
                for (let j = 0; j < sftpOptions.connections; j++) {
                    newWatcher.sftp[j] = new SftpClient({
                        host: sftpOptions.host,
                        cwd: Deno.cwd(),
                        uploaderName: `${watcherName}_sftp_${j + 1}`,
                        logger: listrLogger,
                        // logMode: "unknown-and-error",
                        logMode: "verbose",
                    });
                }
            },
        },
        // Watcher TaskList: Task 2
        {
            title: `${watcherName}: Starting watcher for ${uploadPair.source}`,
            task: (ctx, task) => {
                const watcher$ = watch({
                    watcherName,
                    watchDir: uploadPair.source,
                    logger: listrLogger,
                    ignore: ignorePatterns,
                });

                if (newWatcher.state !== "startup") {
                    throw new Error(
                        `Cannot setup watcher "${watcherName}": state is not "startup", but "${newWatcher.state}" instead!`,
                    );
                }

                newWatcher.watcher$ = watcher$;

                topLvlCtx.watchers.find((watcher) =>
                    watcher.watcherName === watcherName
                )!.state = "running";

                // watcher$.subscribe((allChangedFiles) => {
                //     const dateString = format(
                //         new Date(),
                //         "yyyy-mm-dd HH:mm:ss:SSS",
                //     );
                //     listrLogger.info(
                //         `${dateString} Changed files: ${allChangedFiles.length}`,
                //     );

                //     // slice files into n buckets
                //     const fileBuckets = splitToNChunks(
                //         allChangedFiles,
                //         sftpOptions.connections,
                //     );

                //     // returns a new task list inside this "start watcher" task
                //     return task.newListr((parentTask) => [
                //         {
                //             title:
                //                 `${dateString} Changes detected: Uploading ${allChangedFiles.length} files`,
                //             task: (ctx, task): Listr =>
                //                 task.newListr((
                //                     _parentTask,
                //                 ) => fileBuckets.map(
                //                     (bucket, index) => {
                //                         return createSftpUploadTask(
                //                             ctx.sftp[index],
                //                             bucket,
                //                             `SFTP${index + 1}`,
                //                         );
                //                     },
                //                 )),
                //         },
                //     ]);
                // });
            },
        },
        // Watcher TaskList: Task 3
        {
            title: `${watcherName}: Remote cd to '${uploadPair.destination}'`,
            task: async (ctx, _task) => {
                for (let j = 0; j < sftpOptions.connections; j++) {
                    // CAUTION: the destination folder MUST exist on the server! Upload WILL fail otherwise!
                    // TODO: add ensureDir functionality for sftp (same as mkdir -p)
                    // await ctx.sftp[j].cd(
                    //     uploadPair.destination,
                    // );
                    const watcher = topLvlCtx.watchers.find((watcher) =>
                        watcher.watcherName === watcherName
                    );
                    if (watcher === undefined || watcher.state !== "running") {
                        throw new Error(
                            `Could not find running watcher "${watcherName}" in the top level context!`,
                        );
                    }

                    try {
                        await watcher.sftp[j].cd(
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
    ]);
}
