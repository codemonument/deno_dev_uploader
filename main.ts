import { Command } from "@cliffy/command";

// Will be executed when this module is run directly as an entrypoint
// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (!import.meta.main) {
  throw new Error("This module is a cli and can only be run directly!");
}

console.log("Hello world");
