import { Command } from "@cliffy/command";

export const cli = new Command()
    .name("dev-uploader")
    .description(
        `A cli to watch build output folders and upload them to some servers via ssh`,
    )
    .version("0.1.0") //TODO: add auto-version via deno.json or smth. else
    .option("-v, --pureVersion", "Outputs the pure version number", {
        standalone: true,
    })
    .action(({ pureVersion }) => {
        // log the version when -v flag is given
        if (pureVersion) {
            console.log(cli.getVersion());
        }
    });
