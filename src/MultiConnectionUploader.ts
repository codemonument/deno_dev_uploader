import type { SftpClient } from "@codemonument/sftp-client";
import type { SftpOptions } from "./types.ts";
import { splitToNChunks } from "./utils.ts";
import { finalize, map } from "rxjs";
import { roundToPrecision } from "@codemonument/simple-rounding";

export type UploaderOptions = {
    uploaderName: string;
    sftpOptions: SftpOptions;
};

export class MultiConnectionUploader {
    uploaderName: string;
    sftpOptions: SftpOptions;
    openConnections: Array<SftpClient> = [];

    constructor(options: UploaderOptions) {
        this.sftpOptions = options.sftpOptions;
        this.uploaderName = options.uploaderName;
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
