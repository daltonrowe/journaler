import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export default function spawnAndLog(cmd, options = {},) {
  return new Promise(resolve => {
    const p = spawn(cmd, { shell: true });
    let stdin = '';

    p.stdout.on('data', data => {
      if (options.log) console.log(`\x1b[32m${data}\x1b[0m`);
      stdin += data;
    });

    p.stderr.on('data', data => {
      if (options.log) console.log(`\x1b[31m${data}\x1b[0m`);
    });

    p.on('exit', code => {
      if (code) console.error(`Exit code ${code}`);
      resolve(stdin);
    });
  });
}