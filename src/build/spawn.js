/* @flow */
//jshint ignore:start

var _ = require('lodash');
var RSVP = require('rsvp');
var cproc = require('child_process');

// Spawns a process and passes stdout and stderr through.
export default function spawn(command: string, args: string[]=[]): Promise<void> {
  return new RSVP.Promise(function(resolve, reject) {
    var proc = cproc.spawn(command, args, {stdio:'inherit'});
    proc.on('exit', function(code) {
      if (code === 0) {
        resolve();
      } else {
        var err: Error&Object = new Error("Process exited with code "+code);
        err.code = code;
        reject(err);
      }
    });
  });
}
