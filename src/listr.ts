import { Manager } from "@listr2/manager";
import { type ListrBaseClassOptions, ListrLogger } from "npm:listr2";
import type { SftpClient } from "@codemonument/sftp-client";

export type ListrCtx = {
    sftp: Array<SftpClient>;
};

export function createListrManager<T = unknown>(
    override?: ListrBaseClassOptions,
): Manager<T> {
    return new Manager({
        concurrent: true,
        exitOnError: false,
        rendererOptions: {
            collapseSubtasks: false,
            collapseSkips: false,
        },
        ctx: {
            sftp: [],
        },
        ...override,
    });
}

export const logger = new ListrLogger({
    useIcons: false,
});
