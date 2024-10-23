import type { Observable } from "rxjs";
import type { MultiConnectionUploader } from "./MultiConnectionUploader.ts";

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

export type SftpOptions = {
    host: string;
    connections: number;
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
        uploader?: MultiConnectionUploader;
    }
    | WatcherBase & {
        state: "running";
        watcher$: Observable<string[]>;
        uploader: MultiConnectionUploader;
    };
