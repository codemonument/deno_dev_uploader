import { Command } from "@cliffy/command";
import { existsSync } from "@std/fs";
import { format } from "date-fns";
import type { Listr } from "listr2";
import { generateUploadTasklist } from "./listr-tasks/uploadlist.ts";
import { generateWatcherTasklist } from "./listr-tasks/watchlist.ts";
import {
    createListrManager,
    listrLogger,
    type ListrTopLvlCtx,
} from "./listr.ts";
import type { UploadPair, WatcherDefinition } from "./types.ts";
import { MultiProgressBars } from "multi-progress-bars";
import chalk from "chalk";

export const cli = new Command()
    .name("dev-uploader")
    .description(
        `A cli to watch build output folders and upload them to some servers via ssh`,
    )
    .version("0.1.0") //TODO: add auto-version via deno.json or smth. else
    .option("-v, --pure-version", "Outputs the pure version number", {
        // this option is standalone, so it does not execute the main action() handler of this cli, but it's own action
        standalone: true,
        action: () => {
            console.log(cli.getVersion());
        },
    })
    .option(
        "-u, --upload-pair <upload-pair>",
        `An upload-pair in the format of <source>:<destination>. 
        Min one upload-pair is required. 
        CAUTION: This option can be set multiple times, but destination must be on the same --sftp.host for each upload-pair.
        CAUTION: The destination folder MUST exist on the server! Upload WILL fail otherwise! 
        `,
        {
            collect: true,
            required: true,
        },
    )
    .option(
        "-w.i.e, --watcher.ignore.path-ends-with <endsWithPattern>",
        `Optional: Path patterns to ignore in the watcher. Will be checked via string.endsWith().
         Can be added multiple times.
         For example: '-w.i.e .js.map -w.i.e stats.js' will filter all file paths ending with '.js.map' or 'stats.js'.`,
        {
            collect: true,
        },
    )
    .option(
        "-w.i.i, --watcher.ignore.path-includes <includesPattern>",
        `Optional: Path patterns to ignore in the watcher. Will be checked via string.includes().
         Can be added multiple times.
         For example: '-w.i.i .js.map -w.i.i stats.js' will filter all file paths containing '.js.map' or 'stats.js'.
         Note: prefer --watcher.ignore.path-ends-with if possible.`,
        {
            collect: true,
        },
    )
    .option(
        "-s.h, --sftp.host <host:string>",
        `The ssh host to connect to. 
        Note: This uploader does not handle any authentication, 
        so make sure to have this hostname in your ssh config, complete with a valid ssh key setup.`,
        {
            required: true,
        },
    )
    .option(
        "-s.c, --sftp.connections <connectionCount:integer>",
        "Optional: The number of sftp connections to use",
        {
            default: 6,
        },
    )
    .action(
        async (
            { uploadPair: uploadPairStrings, watcher, sftp: sftpOptions },
        ) => {
            // STEP 0: sanitize the ignore patterns
            // TODO: make issue in cliffy git repo about wrong typing when using "Dottet options" together with "collect: true"
            // https://github.com/c4spar/deno-cliffy/issues
            if (watcher?.ignore) {
                console.log(`Found ignore patterns: `, watcher?.ignore);
            }
            let ignorePatterns: {
                pathEndsWith: string[];
                pathIncludes: string[];
            } = {
                pathEndsWith: [],
                pathIncludes: [],
            };
            if (watcher?.ignore?.pathEndsWith) {
                const inputAsArray = watcher.ignore
                    .pathEndsWith as unknown as string[];
                ignorePatterns.pathEndsWith = inputAsArray;
            }
            if (watcher?.ignore?.pathIncludes) {
                const inputAsArray = watcher.ignore
                    .pathIncludes as unknown as string[];
                ignorePatterns.pathIncludes = inputAsArray;
            }

            // STEP 1: extract and validate upload pairs from the cli options
            const uploadPairs = uploadPairStrings
                .map((uploadPairString) => {
                    const [source, destination] = uploadPairString.split(":");

                    // validate existence of source
                    if (existsSync(source) === false) {
                        console.error(
                            `Source folder ${source} does not exist! - upload pair "${uploadPairString}" will be ignored!`,
                        );
                        return undefined;
                    }

                    return { source, destination } satisfies UploadPair;
                }).filter((uploadPair) => uploadPair !== undefined);

            // STEP 1b: exit early if no valid upload pairs were found
            if (uploadPairs.length === 0) {
                console.error("No valid upload pairs found! Exiting...");
                Deno.exit(1);
            }

            // STEP 2 - Init MultiProgressBar
            const progressBar = new MultiProgressBars({
                initMessage: "This is my init message...",
                anchor: "top",
                persist: true,
                border: true,
            });

            // Experiments with MultiProgressBar
            progressBar.addTask("test_1", {
                type: "percentage",
                barTransformFn: chalk.yellow,
            });
            progressBar.addTask("test_2", {
                type: "percentage",
                barTransformFn: chalk.green,
            });

            setInterval(() => {
                progressBar.incrementTask("test_1", { percentage: 0.1 });
            }, 100);
            setInterval(() => {
                progressBar.incrementTask("test_2", { percentage: 0.1 });
            }, 200);

            console.log("Test");

            // LEGACY CODE - to be removed

            // STEP 2 - Create the Listr Task manager and prepare the init tasks
            // const globalTaskList = createListrManager<ListrTopLvlCtx>();

            // STEP 3 - Start the watchers (with uploading included)
            // for (let i = 0; i < uploadPairs.length; i++) {
            //     const uploadPair = uploadPairs[i];
            //     const watcherName = `watcher_${i + 1}`;
            //     globalTaskList.add([
            //         {
            //             title:
            //                 `${watcherName}: ${uploadPair.source} -> ${uploadPair.destination}`,
            //             task: (topLvlCtx, task): Listr => {
            //                 // Create new WatcherDefinition
            //                 const newWatcherDefinition = {
            //                     state: "startup",
            //                     watcherName,
            //                     uploadPair,
            //                     ignorePatterns,
            //                     sftpOptions,
            //                     sftp: [],
            //                 } satisfies WatcherDefinition;
            //                 topLvlCtx.watchers.push(newWatcherDefinition);

            //                 // Generate tasks for this new watcher
            //                 return generateWatcherTasklist(
            //                     task,
            //                     topLvlCtx,
            //                     newWatcherDefinition,
            //                 );
            //             },
            //         },
            //     ]);
            // }

            // // STEP 4 - Run all initial Tasks
            // await globalTaskList.runAll();

            // // Step 5 - subscribe to the watchers and add new upload tasks for each emission
            // for (const watcher of globalTaskList.ctx.watchers) {
            //     if (watcher.state !== "running") {
            //         listrLogger.log(
            //             `error`,
            //             `Watcher "${watcher.watcherName}" is not running!`,
            //         );
            //         return;
            //     }

            //     watcher.watcher$.subscribe((files) => {
            //         const dateString = format(
            //             new Date(),
            //             "yyyy-mm-dd HH:mm:ss:SSS",
            //         );
            //         listrLogger.info(
            //             `${dateString} Changed files: ${files.length}`,
            //         );

            //         globalTaskList.add([
            //             {
            //                 title:
            //                     `${dateString} Changes detected: Uploading ${files.length} files`,
            //                 task: (topLvlCtx, task): Listr => {
            //                     return generateUploadTasklist(task, topLvlCtx, {
            //                         watcher,
            //                         dateString,
            //                         files,
            //                         sftpOptions,
            //                     });
            //                 },
            //             },
            //         ]);
            //     });

            //     // after adding the tasks inside the bufferedWatch, run them to upload
            //     await globalTaskList.runAll();
            // }
        },
    );
