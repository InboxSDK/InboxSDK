/* @flow */
//jshint ignore:start

var isWatching = false;
var POLL_TIME = 2000;

function doCheck() {
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
};

var HMRManager = {
  startWatch() {
    if (isWatching || !(module:any).hot) return;
    isWatching = true;
    doCheck();
  }
};

export default HMRManager;
