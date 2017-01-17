/* @flow */

const cproc = require('child_process');

// Spawns a process and passes stdout and stderr through.
export default function spawn(command: string, args: string[]=[]): Promise<void> {
  return new Promise(function(resolve, reject) {
    const proc = cproc.spawn(command, args, {stdio:'inherit'});
    proc.on('exit', function(code) {
      if (code === 0) {
        resolve();
      } else {
        const err: Error&Object = new Error("Process exited with code "+code);
        err.code = code;
        reject(err);
      }
    });
  });
}
