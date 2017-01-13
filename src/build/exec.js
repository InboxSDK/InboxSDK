/* @flow */

const cproc = require('child_process');

// Executes a process and captures stdout.
export default function exec(cmd: string, options:Object={}): Promise<any> {
  const {passStdErr} = options;
  return new Promise((resolve, reject) => {
    cproc.exec(cmd, (err, stdout, stderr) => {
      if (err) {
        if (stderr) {
          process.stderr.write(stderr);
        }
        reject(err);
      } else {
        if (passStdErr) {
          resolve({stdout, stderr});
        }
        else {
          if (stderr) {
            process.stderr.write(stderr);
          }
          resolve(stdout);
        }
      }
    });
  });
}
