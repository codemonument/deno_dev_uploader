import type { GenericLogger } from "./GenericLogger.type.ts";

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
};

export async function watch({ watchDir, logger = console }: WatcherOptions) {
    logger.log(`Watching dir "${watchDir}" for changes...`);
}
