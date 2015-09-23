/* @flow */
//jshint ignore:start

const once = require('lodash/function/once');
const defer = require('lodash/function/defer');
import logError from './log-error';
import ajax from './ajax';
import delay from './delay';

declare var chrome: ?Object;
declare var safari: ?Object;

const isContentScript: () => boolean = once(function() {
  if (typeof chrome != 'undefined' && chrome && chrome.extension)
    return true;
  if (typeof safari != 'undefined' && safari && safari.extension)
    return true;
  return false;
});

function addScriptToPage(url: string, cors: boolean): Promise<void> {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  if (cors) {
    script.crossOrigin = 'anonymous';
  }

  const promise = new global.Promise(function(resolve, reject) {
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
  let pr;
  if (isContentScript()) {
    function attempt(retryNum: number, lastErr: ?Error): Promise<void> {
      if (retryNum > 3) {
        throw lastErr || new Error("Ran out of loadScript attempts for unknown reason");
      }

      return ajax({
        url, cachebust: retryNum > 0
      }).then(response => {
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
        let code = response.text;
        const indirectEval = eval;
        if (!opts || !opts.nowrap) {
          code = "(function(){"+code+"\n});";
        }
        let program;
        try {
          program = indirectEval(code+"\n//# sourceURL="+url+"\n");
        } catch(err) {
          if (err && err.name === 'SyntaxError') {
            logError(err, {
              retryNum,
              caughtSyntaxError: true,
              url,
              message: `SyntaxError in loading ${url}. Did we not load it fully? Trying again...`
            }, {});
            return delay(5000).then(() => attempt(retryNum+1, err));
          }
          throw err;
        }
        if (!opts || !opts.nowrap) {
          program();
        }
      });
    }
    pr = attempt(0, null);
  } else {
    // Try to add script as CORS first so we can get error stack data from it.
    pr = addScriptToPage(url, true).catch(() => {
      // Only show the warning if we successfully load the script on retry.
      return addScriptToPage(url, false).then(() => {
        console.warn("Script "+url+" included without CORS headers. Error logs might be censored by the browser.");
      });
    });
  }
  return pr.catch(err => {
    logError(err, {
      url,
      message: 'Failed to load script'
    }, {});
  });
}
