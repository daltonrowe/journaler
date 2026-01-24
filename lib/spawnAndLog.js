import { spawn } from "node:child_process";

export default function spawnAndLog(cmd, cwd, options = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, { shell: true, cwd });
    let stdout = "";
    let stderr = "";

    p.stdout.on("data", (data) => {
      if (options.log) console.log(`\x1b[32m${data}\x1b[0m`);
      stdout += data;
    });

    p.stderr.on("data", (data) => {
      if (options.log) console.log(`\x1b[31m${data}\x1b[0m`);
      stderr += data;
    });

    p.on("exit", (code) => {
      if (code) console.error(`Exit code ${code}`);
      resolve({ stdout, stderr });
    });
  });
}
