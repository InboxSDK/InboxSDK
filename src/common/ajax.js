var $ = require('jquery');
var RSVP = require('rsvp');
var assert = require('assert');

// Proper Promise wrapper around $.ajax
function Ajax(opts) {
  assert(opts && typeof opts.url == 'string', 'URL must be given');
  return RSVP.Promise.cast($.ajax(opts)).catch(function(jqXHR) {
    var err = new Error("Failed to load "+opts.url+": "+ (jqXHR && jqXHR.statusText));
    err.xhr = jqXHR;
    throw err;
  });
}

module.exports = Ajax;
