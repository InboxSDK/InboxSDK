'use strict';

var _ = require('lodash');
var util = require('util');
var Bacon = require('baconjs');
var fromEventTargetCapture = require('../lib/from-event-target-capture');

var EventEmitter = require('../lib/safe-event-emitter');

var memberMap = new WeakMap();

/**
 * @class
 * Represents a mole view. These are modals attached to the bottom of the
 * viewport, like a compose view.
 */
function MoleView(options) {
  EventEmitter.call(this);

  var members = {
    driver: options.moleViewDriver
  };
  memberMap.set(this, members);

  members.driver.getStopper().onValue(() => {
    this.emit('destroy');
  });
}

util.inherits(MoleView, EventEmitter);

_.assign(MoleView.prototype, /** @lends MoleView */ {

  /**
   * This closes the mole view. Does nothing if already closed.
   * @return {void}
   */
  close: function() {
    var members = memberMap.get(this);
    members.driver.destroy();
  },

  setTitle: function(text) {
    var members = memberMap.get(this);
    members.driver.setTitle(text);
  },

  setMinimized: function(minimized) {
    var members = memberMap.get(this);
    members.driver.setMinimized(minimized);
  }

  /**
   * Fires when this MoleView instance is closed.
   * @event MoleView#destroy
   */
});

module.exports = MoleView;
