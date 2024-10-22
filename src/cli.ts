import { Command } from "@cliffy/command";

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
        "-u, --upload-pair",
        "An upload-pair in the format of <source>:<destination>. Note: this option can be set multiple times, but destination must be on the same host for each upload-pair",
        {
            collect: true,
        },
    )
    .action(() => {
    });
