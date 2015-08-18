/* @flow */
//jshint ignore:start

var hs = require('http-server');
var path = require('path');
var _ = require('lodash');

export function run() {
  var server = hs.createServer({
    root: path.join(__dirname, '..', 'dist'),
    cache: 2,
    showDir: 'false',
    cors: true,
    robots: true
  });
  server.listen(4567, 'localhost');
}
