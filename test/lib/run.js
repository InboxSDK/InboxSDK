var RSVP = require('rsvp');
var cproc = require('child_process');

// Runs a command without capturing its output.
function run(command, args) {
  return new RSVP.Promise(function(resolve, reject) {
    var proc = cproc.spawn(command, args);
    function killProc() {
      proc.kill();
    }
    process.on('exit', killProc);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on('exit', function(code) {
      process.removeListener('exit', killProc);
      if (code === 0) {
        resolve();
      } else {
        var err = new Error("Program failed with exit status "+code);
        err.code = code;
        reject(err);
      }
    });
  });
}

module.exports = run;
