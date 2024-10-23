import { type GenericLogger, SftpClient } from "@codemonument/sftp-client";
import type { SftpOptions } from "./types.ts";
import { splitToNChunks } from "./utils.ts";
import { finalize, map } from "rxjs";
import { roundToPrecision } from "@codemonument/simple-rounding";

export type UploaderOptions = {
    /**
     * @exaple `${watcherName}_sftp`
     */
    uploaderName: string;
    sftpOptions: SftpOptions;
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
    openConnections: Array<SftpClient> = [];

    constructor(options: UploaderOptions) {
        this.sftpOptions = options.sftpOptions;
        this.uploaderName = options.uploaderName;

        // init sftp connections
        for (let j = 0; j < this.sftpOptions.connections; j++) {
            this.openConnections[j] = new SftpClient({
                host: this.sftpOptions.host,
                cwd: Deno.cwd(),
                uploaderName: `${this.uploaderName}_sftp_${j + 1}`,
                logger: options.logger,
                logMode: "unknown-and-error",
                // logMode: "verbose",
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

        const progressArray$ = fileBuckets.map(
            (fileBucket, index) => {
                // return createSftpUploadTask(
                //     watcher.sftp[index],
                //     bucket,
                //     `SFTP${index + 1}`,
                // );
                const sftp = this.openConnections[index];
                const start = performance.now();

                return sftp.uploadFiles$(fileBucket).pipe(
                    map(({ file, nr }) => `Uploading file ${nr}: ${file}`),
                    finalize(() => {
                        const end = performance.now();
                        const durationInSek = roundToPrecision(
                            (end - start) / 1000,
                            2,
                        );
                        const text =
                            `${this.uploaderName}: Uploaded ${fileBucket.length} files in ${durationInSek} seconds!`;
                        return text;
                    }),
                );
            },
        );

        return progressArray$;
    }
}
