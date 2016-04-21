'use strict';

var _ = require('lodash');
var util = require('util');

var EventEmitter = require('../lib/safe-event-emitter');

var memberMap = new WeakMap();

// documented in src/docs/
function MoleView(options) {
  EventEmitter.call(this);

  this.destroyed = false;
  var members = {
    driver: options.moleViewDriver
  };
  memberMap.set(this, members);

  members.driver.getEventStream().onValue(e => {
    this.emit(e.eventName, e.detail);
  });
  members.driver.getEventStream().onEnd(() => {
    this.destroyed = true;
    this.emit('destroy');
  });
}

util.inherits(MoleView, EventEmitter);

_.assign(MoleView.prototype, {

  close() {
    var members = memberMap.get(this);
    members.driver.destroy();
  },

  setTitle(text) {
    var members = memberMap.get(this);
    members.driver.setTitle(text);
  },

  setMinimized(minimized) {
    var members = memberMap.get(this);
    members.driver.setMinimized(minimized);
  },

  getMinimized() {
    var members = memberMap.get(this);
    return members.driver.getMinimized();
  }

});

module.exports = MoleView;
