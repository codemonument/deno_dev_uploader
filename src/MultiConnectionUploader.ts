import { type GenericLogger, SftpClient } from "@codemonument/sftp-client";
import { roundToPrecision } from "@codemonument/simple-rounding";
import { finalize, map } from "rxjs";
import type { SftpOptions } from "./types.ts";
import { splitToNChunks } from "./utils.ts";
import { MultiProgressBars } from "multi-progress-bars";
import chalk from "chalk";
import { tap } from "rxjs";

export type UploaderOptions = {
    /**
     * @exaple `${watcherName}_sftp`
     */
    uploaderName: string;
    sftpOptions: SftpOptions;
    progressBar: MultiProgressBars;
    logger?: GenericLogger;
};

/**
 * SFTP INFO
 * - source files are referenced from the cwd of this cli, for example:
 * -   dist/apps/myapp/assets/svg-icons/ms_access.svg
 */
export class MultiConnectionUploader {
    uploaderName: string;
    sftpOptions: SftpOptions;
    progressBar: MultiProgressBars;
    openConnections: Array<SftpClient> = [];

    constructor(options: UploaderOptions) {
        this.sftpOptions = options.sftpOptions;
        this.uploaderName = options.uploaderName;
        this.progressBar = options.progressBar;

        // init sftp connections
        for (let j = 0; j < this.sftpOptions.connections; j++) {
            const connectionName = `${this.uploaderName}_${j + 1}`;
            this.openConnections[j] = new SftpClient({
                host: this.sftpOptions.host,
                cwd: Deno.cwd(),
                uploaderName: connectionName,
                logger: options.logger,
                logMode: "unknown-and-error",
                // logMode: "verbose",
            });
            this.progressBar.addTask(connectionName, {
                type: "percentage",
                barTransformFn: chalk.red,
                message: `Waiting for changes...`,
                percentage: 0,
            });
        }
    }

    async cdInto(path: string) {
        for (const sftp of this.openConnections) {
            await sftp.cd(path);
        }
    }

    uploadFiles(files: string[]) {
        // slice files into n buckets
        const fileBuckets = splitToNChunks(
            files,
            this.sftpOptions.connections,
        );

        fileBuckets.forEach(
            (fileBucket, index) => {
                const sftp = this.openConnections[index];
                const taskName = `${this.uploaderName}_${index + 1}`;
                const start = performance.now();

                const uploadProgress$ = sftp.uploadFiles$(fileBucket).pipe(
                    map(({ file, nr }) => ({
                        text: `Uploading file ${nr}: ${file}`,
                        percentage: roundToPrecision(nr / fileBucket.length, 2),
                    })),
                );

                uploadProgress$.subscribe({
                    next: ({ text, percentage }) => {
                        this.progressBar.updateTask(taskName, {
                            message: text,
                            percentage,
                        });
                    },
                    complete: () => {
                        const end = performance.now();
                        const durationInSek = roundToPrecision(
                            (end - start) / 1000,
                            2,
                        );
                        const text =
                            `${this.uploaderName}: Uploaded ${fileBucket.length} files in ${durationInSek} seconds!`;
                        this.progressBar.done(taskName, {
                            message: text,
                        });
                    },
                });
            },
        );
    }
}
