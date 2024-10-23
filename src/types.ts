import type { SftpClient } from "@codemonument/sftp-client";
import type { Observable } from "rxjs";

export type UploadPair = {
    /**
     * The source folder path to upload
     */
    source: string;

    /**
     * The remote folder path to upload to.
     */
    destination: string;
};

export type IgnorePatterns = {
    pathEndsWith: string[];
    pathIncludes: string[];
};

type WatcherBase = {
    watcherName: string;
    uploadPair: UploadPair;
    ignorePatterns: IgnorePatterns;
    sftpOptions: {
        host: string;
        connections: number;
    };
};

export type WatcherDefinition =
    | WatcherBase & {
        state: "prepared";
    }
    | WatcherBase & {
        state: "startup";
        watcher$?: Observable<string[]>;
        sftp?: Array<SftpClient>;
    }
    | WatcherBase & {
        state: "running";
        watcher$: Observable<string[]>;
        sftp: Array<SftpClient>;
    };
