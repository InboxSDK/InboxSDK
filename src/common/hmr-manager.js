/* @flow */
//jshint ignore:start

var ud = require('ud');
var POLL_TIME = 2000;

var shared = ud.defonce(module, ()=>({isWatching: false}));

var doCheck = ud.defn(module, function doCheck() {
  (module:any).hot.check((err, outdated) => {
    if (err) {
      console.error('[HMR] Check error', err);
    }
    if (outdated) {
      (module:any).hot.apply(function(err, updated) {
        if (err) {
          console.error('[HMR] Update error', err);
        } else {
          console.log('[HMR] Replaced modules', updated);
        }
        setTimeout(doCheck, POLL_TIME);
      });
    } else {
      setTimeout(doCheck, POLL_TIME);
    }
  });
});

var HMRManager = {
  startWatch() {
    if (shared.isWatching || !(module:any).hot) return;
    shared.isWatching = true;
    doCheck();
  }
};

export default HMRManager;
