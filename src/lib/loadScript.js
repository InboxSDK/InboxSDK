var $ = require('jquery');
var _ = require('lodash');
var RSVP = require('rsvp');

var isContentScript = _.memoize(function() {
  if (typeof chrome != 'undefined' && chrome.extension)
    return true;
  if (typeof safari != 'undefined' && safari.application)
    return true;
  return false;
});

function addScriptToPage(url, cors) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  if (cors) {
    script.crossOrigin = 'anonymous';
  }

  var promise = new RSVP.Promise(function(resolve, reject) {
    script.addEventListener('error', function(event) {
      reject(event.error ||
        new Error(
          event.message || "Load failure: "+url,
          event.filename, event.lineno, event.column));
    }, false);
    script.addEventListener('load', function() {
      // Make sure the script has a moment to execute before this promise
      // resolves.
      _.defer(resolve);
    }, false);
  });

  script.src = url;
  document.head.appendChild(script);
  return promise;
}

function loadScript(url) {
  if (isContentScript()) {
    return RSVP.Promise.cast($.ajax({
      url: url,
      dataType: 'text'
    })).catch(function(jqXHR) {
      var err = new Error("Failed to load "+url+": "+ (jqXHR && jqXHR.statusText));
      err.xhr = jqXHR;
      throw err;
    }).then(function(code) {
      // jshint evil:true
      var compiled = new Function(code);
      compiled();
    });
  } else {
    // Try to add script as CORS first so we can get error stack data from it.
    return addScriptToPage(url, true).catch(function() {
      // Only show the warning if we successfully load the script on retry.
      return addScriptToPage(url, false).then(function() {
        console.warn("Script "+url+" included without CORS headers. Error logs might be censored by the browser.");
      });
    });
  }
}

module.exports = loadScript;
