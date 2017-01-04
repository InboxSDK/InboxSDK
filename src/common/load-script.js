/* @flow */

const once = require('lodash/once');
const defer = require('lodash/defer');
import connectivityTest from './connectivity-test';
import logError from './log-error';
import ajax from './ajax';
import delay from 'pdelay';

const isContentScript: () => boolean = once(function() {
  if (global.chrome && global.chrome.extension)
    return true;
  if (global.safari && global.safari.extension)
    return true;
  return false;
});

function addScriptToPage(url: string, cors: boolean): Promise<void> {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  if (cors) {
    script.crossOrigin = 'anonymous';
  }

  const promise = new Promise(function(resolve, reject) {
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

export type LoadScriptOptions = {
  // By default, the script is executed within a function, so that top-level
  // variables defined in it don't become global variables. Setting nowrap to
  // true disables this behavior.
  nowrap?: boolean;
  disableSourceMappingURL?: boolean;
};

export default function loadScript(url: string, opts?: LoadScriptOptions): Promise<void> {
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
        const originalCode = response.text;
        const indirectEval = eval;

        let codeParts = [];
        if (opts && opts.disableSourceMappingURL) {
          // Don't remove a data: URI sourcemap (used in dev)
          codeParts.push(originalCode.replace(/\/\/# sourceMappingURL=(?!data:)[^\n]*\n?$/, ''));
        } else {
          codeParts.push(originalCode);
        }

        if (!opts || !opts.nowrap) {
          codeParts.unshift("(function(){");
          codeParts.push("\n});");
        }

        codeParts.push("\n//# sourceURL="+url+"\n");

        const codeToRun = codeParts.join('');
        let program;
        try {
          program = indirectEval(codeToRun);
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
          // SyntaxErrors are the only errors that can happen during eval that we
          // retry because sometimes AppEngine doesn't serve the full javascript.
          // No other error is retried because other errors aren't likely to be
          // transient.
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
  pr.catch(err => {
    return connectivityTest().then(connectivityTestResults => {
      logError(err, {
        url,
        connectivityTestResults,
        status: err && err.status,
        response: (err && err.xhr) ? err.xhr.responseText : null,
        message: 'Failed to load script'
      }, {});
    })
  });
  return pr;
}
