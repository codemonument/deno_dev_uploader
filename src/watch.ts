import {
    filter as webFilter,
    simpleCallbackTarget,
} from "@codemonument/rx-webstreams";
import { bufferWhen, debounceTime, filter, map, Observable } from "rxjs";
import type { GenericLogger } from "./GenericLogger.type.ts";
import { walkSync } from "@std/fs";

export type WatcherOptions = {
    /**
     * The directory to watch for changes
     */
    watchDir: string;

    /**
     * A name for the watcher to identify it in logs
     */
    watcherName: string;

    /**
     * A logger to use for logging messages
     * @optional - defaults to `console`
     */
    logger?: GenericLogger;

    /**
     * The milliseconds the buffer waits for new events before emitting the buffer.
     * Example: If set to 1000, the buffer will wait for 1000 ms of no new events before emitting the buffer.
     * If a new event happens within these 1000ms, the new event will be added to the buffer and the timer will reset.
     *
     * @default 1000 (1 second)
     */
    debounceBufferMs?: number;

    ignore?: {
        /**
         * An array of patterns to ignore in the watcher.
         * The patterns will be checked via `string.endsWith()`.
         * For example: `['.css.map', '.js.map']` will filter all files ending with '.css.map' or '.js.map'.
         *
         * This option is more explicit than `pathIncludes` and should be preferred if possible.
         */
        pathEndsWith?: string[];

        /**
         * An array of patterns to ignore in the watcher.
         * The patterns will be checked via `string.includes()`.
         * For example: `['stats.json']` will filter all files containing 'stats.json' in their path.
         */
        pathIncludes?: string[];
    };

    /**
     * If set to `true`, the watcher will emit all files in the watched directory on startup.
     * Default: true
     */
    emitInitialFiles?: boolean;
};

/**
 * @param options - An options object for the watcher (see `WatcherOptions` type)
 * @returns An rxjs observable which emits an array of filepaths that changed in the watched directory,
 * after no new changes happened for `1000` milliseconds (can be configured with the `debounceBufferMs` option).
 */
export function watch(
    {
        watchDir,
        logger = console,
        debounceBufferMs = 1000,
        ignore = {
            pathEndsWith: [],
            pathIncludes: [],
        },
        emitInitialFiles = true,
    }: WatcherOptions,
): Observable<string[]> {
    logger.log(`Watching dir "${watchDir}" for creations or changes...`);

    const rxjsWatch$ = new Observable<{
        eventType: string;
        filepath: string;
    }>((subscriber) => {
        if (emitInitialFiles) {
            const initialWalker = walkSync(watchDir, {
                includeDirs: false,
            });

            for (const entry of initialWalker) {
                subscriber.next({
                    eventType: "create",
                    filepath: entry.path,
                });
            }
        }

        // create deno fs watcher
        const watcher = Deno.watchFs(watchDir, { recursive: true });
        const watcherStream = ReadableStream.from(watcher);

        // filter events to only "modify" and "create" events
        watcherStream
            .pipeThrough(webFilter((watchEvent) => {
                // only accept "modify" and "create" events
                if (!["modify", "create"].includes(watchEvent.kind)) {
                    return false;
                }

                return true;
            }))
            .pipeTo(simpleCallbackTarget((event) => {
                // make sure every event in the stream has only one filepath
                for (const path of event.paths) {
                    subscriber.next({
                        eventType: event.kind,
                        filepath: path,
                    });
                }
            }));
    });

    // Logic:
    // 1. Buffer all events until no more changes happen for 1 second
    // 2. Deduplicate filepaths (via a set)
    // 3. Emit all files that changed at once
    const bufferedWatch$ = rxjsWatch$.pipe(
        // filter unwanted files (e.g. stats.json)
        filter(({ filepath }) => {
            for (const pattern of ignore.pathIncludes ?? []) {
                // directly return false for the filter if the pattern is found in the filepath => early return
                if (filepath.includes(pattern)) {
                    return false;
                }
            }

            for (const pattern of ignore.pathEndsWith ?? []) {
                // directly return false for the filter if the pattern is found in the filepath => early return
                if (filepath.endsWith(pattern)) {
                    return false;
                }
            }

            return true;
        }),
        // note: bufferWhen emits empty arrays when debounceTime is reached but no new events happened...
        bufferWhen(() => rxjsWatch$.pipe(debounceTime(debounceBufferMs))),
        // ... therefore we filter out empty arrays
        filter((changeObjects) => changeObjects.length > 0),
        // deduplicate change events by filepath
        map((changeObjects) => {
            const files = changeObjects.reduce<Set<string>>(
                (set, changeObject) => {
                    if (changeObject.filepath) {
                        set.add(changeObject.filepath);
                    }
                    return set;
                },
                new Set<string>(),
            );

            return Array.from(files);
        }),
    );

    return bufferedWatch$;
}
