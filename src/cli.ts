import { Command } from "@cliffy/command";
import { exists, existsSync } from "@std/fs";
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
    .action(({ uploadPair: uploadPairStrings }) => {
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

                return { source, destination };
            }).filter((uploadPair) => uploadPair !== undefined);

        // STEP 1b: exit early if no valid upload pairs were found
        if (uploadPairs.length === 0) {
            console.error("No valid upload pairs found! Exiting...");
            Deno.exit(1);
        }
    });
