/**
 * A listr2 sub tasklist for each upload event from the watchers
 * This is necessary because each upload event uses multiple SftpClients to upload files in parallel and each of them needs to show the current progress
 */

import type { SftpClient } from "@codemonument/sftp-client";
import { roundToPrecision } from "@codemonument/simple-rounding";
import type { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import { finalize, map } from "rxjs";
import type { ListrTopLvlCtx } from "../listr.ts";
import type { SftpOptions, WatcherDefinition } from "../types.ts";
import { splitToNChunks } from "../utils.ts";

export type UploadTasklistOptions = {
    dateString: string;
    files: string[];
    sftpOptions: SftpOptions;
    watcher: WatcherDefinition;
};

export function createSftpUploadTask(
    sftp: SftpClient,
    files: string[],
    uploaderName: string,
) {
    return {
        title: `${uploaderName}: Uploading ${files.length} files`,
        task: (
            _ctx: ListrTopLvlCtx,
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
                    const durationInSek = roundToPrecision(
                        (end - start) / 1000,
                        2,
                    );
                    const text =
                        `${uploaderName}: Uploaded ${fileList.length} files in ${durationInSek} seconds!`;
                    task.title = text;
                }),
            );
        },
    };
}

export function generateUploadTasklist(
    parentTask: ListrTaskWrapper<
        ListrTopLvlCtx,
        typeof DefaultRenderer,
        typeof SimpleRenderer
    >,
    topLvlCtx: ListrTopLvlCtx,
    { watcher, dateString, files, sftpOptions }: UploadTasklistOptions,
) {
    if (watcher.state !== "running") {
        throw new Error(
            `Cannot upload files for watcher "${watcher.watcherName}": state is not "running", but "${watcher.state}" instead!`,
        );
    }

    // slice files into n buckets
    const fileBuckets = splitToNChunks(
        files,
        sftpOptions.connections,
    );
    return parentTask.newListr((task) => {
        return fileBuckets.map(
            (bucket, index) => {
                return createSftpUploadTask(
                    watcher.sftp[index],
                    bucket,
                    `SFTP${index + 1}`,
                );
            },
        );
    });
}
