var _ = require('lodash');
var RSVP = require('rsvp');
var cproc = require('child_process');

function exec() {
  var args = _.toArray(arguments);
  return new RSVP.Promise(function(resolve, reject) {
    cproc.exec.apply(cproc, args.concat(function(err, stdout, stderr) {
      if (stderr) {
        process.stderr.write(stderr);
      }
      if (err || stderr) {
        reject(err);
      } else {
        resolve(stdout);
      }
    }));
  });
}

module.exports = exec;
