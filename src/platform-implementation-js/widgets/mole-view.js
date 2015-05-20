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

  members.driver.getEventStream().onValue(e => {
    this.emit(e.eventName, e.detail);
  });
  members.driver.getEventStream().onEnd(() => {
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

  /**
   * This allows the title to be changed.
   * @param  {string} text
 	 * @return {void}
   */
  setTitle: function(text) {
    var members = memberMap.get(this);
    members.driver.setTitle(text);
  },

  /**
   * This allows the minimize state to be changed.
   * @param  {boolean} minimized - If true, the mole view will be minimized.
 	 * @return {void}
   */
  setMinimized: function(minimized) {
    var members = memberMap.get(this);
    members.driver.setMinimized(minimized);
  }

  /**
   * Fires when this MoleView instance is closed.
   * @event MoleView#destroy
   */

  /**
   * Fires when this MoleView instance is minimized.
   * @event MoleView#minimize
   */

  /**
   * Fires when this MoleView instance is restored.
   * @event MoleView#restore
   */

});

module.exports = MoleView;
