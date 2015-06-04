import assign from 'lodash/object/assign';
import forOwn from 'lodash/object/forOwn';
import querystring from 'querystring';

const serversToIgnore = {};

// Simple ajax helper.
// opts:
// * url
// * [method]
// * [headers] - object
// * [xhrFields] - object
// * [body]
function ajax(opts) {
  if(!opts || typeof opts.url !== 'string') {
    throw new Error('URL must be given');
  }
  return new global.Promise(function(resolve, reject) {
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
    if (Object.prototype.hasOwnProperty.call(serversToIgnore, server)) {
      reject(new Error("Server at "+opts.url+" has told us to stop connecting"));
      return;
    }

    var xhr = new XMLHttpRequest();
    assign(xhr, opts.xhrFields);
    xhr.onerror = function(event) {
      var err = new Error("Failed to load "+opts.url);
      err.event = event;
      err.xhr = xhr;

      // give a way for a server to tell us to go away for now. Good fallback
      // in case a bug ever causes clients to spam a server with requests.
      if (xhr.status == 490) {
        serversToIgnore[server] = true;
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
    forOwn(opts.headers, function(value, name) {
      xhr.setRequestHeader(name, value);
    });
    xhr.send(opts.data);
  });
}

module.exports = ajax;
