/* @flow */
//jshint ignore:start

var _ = require('lodash');
var RSVP = require('rsvp');
var cproc = require('child_process');

// Executes a process and captures stdout.
export default function exec(cmd: string, options:Object={}): Promise {
  var {passStdErr} = options;
  return new RSVP.Promise(function(resolve, reject) {
    cproc.exec(cmd, function(err, stdout, stderr) {
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
