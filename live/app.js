var http = require('http');
var fs = require('fs');

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
    if (req.url === '/gmailsdk-imp.js') {
      if (req.method === 'GET') {
        var imp = fs.createReadStream(__dirname+'/../dist/gmailsdk-imp.js');
        imp.on('error', function() {
          res.writeHead(503);
          res.end();
        });
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET'
        });
        imp.pipe(res);
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
