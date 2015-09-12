/* @flow */
//jshint ignore:start

import once from 'lodash/function/once';
import defer from 'lodash/function/defer';
import ajax from './ajax';

declare var chrome: ?Object;
declare var safari: ?Object;

var isContentScript: () => boolean = once(function() {
  if (typeof chrome != 'undefined' && chrome && chrome.extension)
    return true;
  if (typeof safari != 'undefined' && safari && safari.extension)
    return true;
  return false;
});

function addScriptToPage(url: string, cors: boolean): Promise<void> {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  if (cors) {
    script.crossOrigin = 'anonymous';
  }

  var promise = new global.Promise(function(resolve, reject) {
    script.addEventListener('error', function(event:any) {
      reject(event.error ||
        new Error(
          event.message || "Load failure: "+url,
          event.filename, event.lineno, event.column));
    }, false);
    script.addEventListener('load', function() {
      // Make sure the script has a moment to execute before this promise
      // resolves.
      defer(resolve);
    }, false);
  });

  script.src = url;
  document.head.appendChild(script);
  return promise;
}

export type loadScriptOpts = {
  nowrap?: boolean;
};

export default function loadScript(url: string, opts?: loadScriptOpts): Promise<void> {
  if (isContentScript()) {
    return ajax({
      url: url
    }).then(function(response) {
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
      var code = response.text;
      var indirectEval = eval;
      if (!opts || !opts.nowrap) {
        code = "(function(){"+code+"\n});";
      }
      var program = indirectEval(code+"\n//# sourceURL="+url+"\n");
      if (!opts || !opts.nowrap) {
        program();
      }
    });
  } else {
    // Try to add script as CORS first so we can get error stack data from it.
    return addScriptToPage(url, true).catch(() => {
      // Only show the warning if we successfully load the script on retry.
      return addScriptToPage(url, false).then(() => {
        console.warn("Script "+url+" included without CORS headers. Error logs might be censored by the browser.");
      });
    });
  }
}
