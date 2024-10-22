// Will be executed when this module is run directly as an entrypoint
import { cli } from "./src/cli.ts";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (!import.meta.main) {
  throw new Error("This module is a cli and can only be run directly!");
}

cli.parse(Deno.args);
