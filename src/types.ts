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

export type WatcherDefinition = {
    state: "prepared";
    watcherName: string;
    uploadPair: UploadPair;
    ignorePatterns: IgnorePatterns;
    sftp: {
        host: string;
        connections: number;
    };
} | {
    state: "running";
    watcherName: string;
    uploadPair: UploadPair;
    ignorePatterns: IgnorePatterns;
    sftp: {
        host: string;
        connections: number;
    };
    watcher$: Observable<string[]>;
};
