var _ = require('lodash');
var RSVP = require('rsvp');
var assert = require('assert');

// Simple Ajax helper.
// opts:
// * url
// * [method]
// * [headers] - object
// * [xhrFields] - object
// * [body]
function Ajax(opts) {
  assert(opts && typeof opts.url == 'string', 'URL must be given');
  return new RSVP.Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    _.extend(xhr, opts.xhrFields);
    xhr.onerror = function(event) {
      var err = new Error("Failed to load "+opts.url+": "+ (jqXHR && jqXHR.statusText));
      err.event = event;
      err.xhr = xhr;
      reject(err);
    };
    xhr.onload = function(event) {
      resolve(xhr.responseText);
    };
    xhr.open(opts.method || "GET", opts.url, true);
    _.each(opts.headers, function(value, name) {
      xhr.setRequestHeader(name, value);
    });
    xhr.send(opts.body);
  });
}

module.exports = Ajax;
