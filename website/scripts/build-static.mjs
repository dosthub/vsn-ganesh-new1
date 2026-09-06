import { access, rename, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const api = fileURLToPath(new URL("../app/api", import.meta.url));
const hidden = fileURLToPath(new URL("../.api-hidden", import.meta.url));
const leftover = fileURLToPath(new URL("../app/.api-hidden", import.meta.url));

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Next.js still compiles folders under app/, even dotted ones, so the API
// route must sit outside app/ while output: "export" runs.
if (await exists(leftover)) {
  await rm(leftover, { recursive: true, force: true });
}

let moved = false;
if (await exists(api)) {
  await rm(hidden, { recursive: true, force: true });
  await rename(api, hidden);
  moved = true;
}

const code = await new Promise((resolve) => {
  const child = spawn("npx", ["next", "build", "--webpack"], {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
    shell: process.platform === "win32",
  });
  child.on("exit", (exitCode) => resolve(exitCode ?? 1));
  child.on("error", () => resolve(1));
});

if (moved) {
  try {
    await rm(api, { recursive: true, force: true });
    await rename(hidden, api);
  } catch {
    // Leave the folder where it is if restore fails; the next run will retry.
  }
}

process.exit(code);
