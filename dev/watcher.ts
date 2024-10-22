/**
 * A file to develop the watcher functionality
 */

import { watch } from "../src/watch.ts";

const watcher1$ = watch({
    watchDir: "/Users/bjesuiter/Develop/tt/frontend-mono/dist/apps/maya",
    watcherName: "watcher_1",
});

watcher1$.subscribe((filepaths) => {
    console.log(`watcher_1: Changed files detected: `, {
        count: filepaths.length,
        filepaths,
    });
});
