var _ = require('lodash');
var RSVP = require('rsvp');
var Ajax = require('./ajax');

var isContentScript = _.once(function() {
  if (typeof chrome != 'undefined' && chrome.extension)
    return true;
  if (typeof safari != 'undefined' && safari.extension)
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
    return Ajax({
      url: url
    }).then(function(code) {
      // jshint evil:true

      // Q: Why put the code into a function before executing it instead of
      //    evaling it immediately?
      // A: Chrome would execute it before applying any remembered
      //    breakpoints.
      // Q: Why not just use `... = new Function(...)`?
      // A: The sourcemaps would be off by one line in Chrome because of
      //    https://code.google.com/p/chromium/issues/detail?id=109362
      // Q: indirectEval?
      // A: Using the eval value rather than the eval keyword causes the
      //    code passed to it to be run in the global scope instead of the
      //    current scope. (Seriously, it's a javascript thing.)
      var indirectEval = eval;
      var program = indirectEval("(function(){"+code+"\n});\n//# sourceURL="+url+"\n");
      program();
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
