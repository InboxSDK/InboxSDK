'use strict';

import _ from 'lodash';
import util from 'util';
import Bacon from 'baconjs';

import EventEmitter from '../lib/safe-event-emitter';

const memberMap = new WeakMap();


function TopMessageBarView(options) {
  EventEmitter.call(this);

  var members = {
    driver: options.topMessageBarViewDriver
  };

  memberMap.set(this, members);
}

util.inherits(TopMessageBarView, EventEmitter);

_.assign(TopMessageBarView.prototype, /** @lends TopMessageBarView */ {

  remove: function(){
  	memberMap.get(this).driver.remove();
  }

});

module.exports = TopMessageBarView;
