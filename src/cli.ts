import { Command } from "@cliffy/command";
import { existsSync } from "@std/fs";
import type { UploadPair } from "./types.ts";
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
        Note: this option can be set multiple times, but destination must exist on the same host for each upload-pair. 
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
    .action(({ uploadPair: uploadPairStrings, watcher }) => {
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
    });
