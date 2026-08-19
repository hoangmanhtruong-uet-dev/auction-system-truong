const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");
const rootServerJs = path.join(projectRoot, "server.js");

const resolvedPort = process.env.PORT ? Number(process.env.PORT) : NaN;
if (!Number.isNaN(resolvedPort) && resolvedPort > 0) {
  process.env.PORT = String(resolvedPort);
}
process.env.HOSTNAME = process.env.HOSTNAME ?? "0.0.0.0";
process.env.HOST = process.env.HOST ?? "0.0.0.0";

const useRootServer = fs.existsSync(rootServerJs);
const standaloneStaticCopied =
  fs.existsSync(path.join(standaloneDir, ".next", "static")) &&
  fs.existsSync(path.join(standaloneDir, "public"));
const useStandalone = !useRootServer && fs.existsSync(standaloneServer) && standaloneStaticCopied;

const cwd = useRootServer
  ? projectRoot
  : useStandalone
    ? standaloneDir
    : projectRoot;

const bin = (() => {
  if (useRootServer) return [process.execPath, rootServerJs];
  if (useStandalone) return [process.execPath, standaloneServer];
  try {
    const nextBin = require.resolve("next/dist/bin/next", { paths: [projectRoot] });
    return [process.execPath, nextBin, "start"];
  } catch {
    return ["npx", "next", "start"];
  }
})();

console.log(
  `[start-server] mode=${useRootServer ? "root-server.js" : useStandalone ? "standalone" : "next-start"} port=${process.env.PORT} host=${process.env.HOSTNAME} cmd=${bin.join(" ")} cwd=${cwd}`,
);

const child = spawn(bin[0], bin.slice(1), {
  stdio: "inherit",
  env: process.env,
  cwd,
  shell: process.platform === "win32" && bin[0] === "npx",
});

child.on("exit", (code, signal) => {
  console.log(`[start-server] exited code=${code ?? "null"} signal=${signal ?? "null"}`);
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("[start-server] failed to spawn:", error);
  process.exit(1);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[start-server] forwarding ${sig}`);
    child.kill(sig);
  });
}
