var _ = require('lodash');
var RSVP = require('rsvp');
var assert = require('assert');
var querystring = require('querystring');

var serversToIgnore = new Set();

// Simple ajax helper.
// opts:
// * url
// * [method]
// * [headers] - object
// * [xhrFields] - object
// * [body]
function ajax(opts) {
  assert(opts && typeof opts.url == 'string', 'URL must be given');
  return new RSVP.Promise(function(resolve, reject) {
    if (!opts.method) {
      opts.method = "GET";
    }
    if (opts.data) {
      if (typeof opts.data != "string") {
        opts.data = querystring.stringify(opts.data);
      }
      if (opts.method === "GET") {
        opts.url += (/\?/.test(opts.url) ? "&" : "?") + opts.data;
        delete opts.data;
      }
    }

    var server = opts.url.match(/(?:(?:[a-z]+:)?\/\/)?([^/]*)\//)[1];
    if (serversToIgnore.has(server)) {
      reject(new Error("Server at "+opts.url+" has told us to stop connecting"));
      return;
    }

    var xhr = new XMLHttpRequest();
    _.extend(xhr, opts.xhrFields);
    xhr.onerror = function(event) {
      var err = new Error("Failed to load "+opts.url);
      err.event = event;
      err.xhr = xhr;

      // give a way for a server to tell us to go away for now. Good fallback
      // in case a bug ever causes clients to spam a server with requests.
      if (xhr.status == 490) {
        serversToIgnore.add(server);
      }
      reject(err);
    };
    xhr.onload = function(event) {
      resolve({
        text: xhr.responseText,
        xhr: xhr
      });
    };
    xhr.open(opts.method, opts.url, true);
    _.each(opts.headers, function(value, name) {
      xhr.setRequestHeader(name, value);
    });
    xhr.send(opts.data);
  });
}

module.exports = ajax;
