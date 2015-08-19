/* @flow */
//jshint ignore:start

import * as HMR from './hmr-util';

var shared = HMR.makeShared(module, ()=>({isWatching: false}));
var updatable = HMR.makeUpdatable(module, {POLL_TIME: 2000});

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
        setTimeout(doCheck, updatable.POLL_TIME);
      });
    } else {
      setTimeout(doCheck, updatable.POLL_TIME);
    }
  });
};

var HMRManager = {
  startWatch() {
    if (shared.isWatching || !(module:any).hot) return;
    shared.isWatching = true;
    doCheck();
  }
};

export default HMRManager;
