var RSVP = require('rsvp');
var cproc = require('child_process');

// Runs a command without capturing its output.
function run(command, args) {
  return new RSVP.Promise(function(resolve, reject) {
    var proc = cproc.spawn(command, args);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on('close', function(code) {
      if (code === 0)
        resolve();
      else
        reject(new Error("Program failed with exit status "+code));
    });
  });
}

module.exports = run;
