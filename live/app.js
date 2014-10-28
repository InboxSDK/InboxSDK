var http = require('http');
var fs = require('fs');
var _ = require('lodash');

function delayFilter(fn) {
  return function() {
    var self = this, args = arguments;
    setTimeout(function() {
      fn.apply(self, args);
    }, 500);
  };
}

module.exports.run = function() {
  var server = http.createServer(delayFilter(function (req, res) {
    if (_.contains(['/gmailsdk-imp.js', '/gmailsdk-imp.js.map'], req.url)) {
      if (req.method === 'GET') {
        var file = fs.createReadStream(__dirname+'/../dist'+req.url);
        file.on('error', function() {
          res.writeHead(503);
          res.end();
        });
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET'
        });
        file.pipe(res);
      } else if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET'
        });
        res.end();
      } else {
        res.writeHead(405);
        res.end();
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  }));

  server.listen(4567, 'localhost');
};
