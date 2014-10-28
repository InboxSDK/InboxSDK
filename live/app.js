var http = require('http');
var fs = require('fs');

module.exports.run = function() {
  var server = http.createServer(function (req, res) {
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
  });

  server.listen(4567, 'localhost');
};
