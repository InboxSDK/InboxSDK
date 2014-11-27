var assert = require('assert');
var Bacon = require('baconjs');

function MockMutationObserver(callback) {
  this._callback = callback;
  this._records = [];
  this._updateQueued = false;
  this._stopper = new Bacon.Bus();
}

MockMutationObserver.prototype.observe = function(element, options) {
  assert(element);
  assert(options);

  if (element._emitsMutations) {
    Bacon
      .fromEventTarget(element, 'mutation')
      .takeUntil( Bacon.fromEventTarget(element, 'removed') )
      .takeUntil( this._stopper )
      .onValue(this._queueMutation.bind(this));
  }
};

MockMutationObserver.prototype.disconnect = function() {
  this._stopper.push('stop');
  this.takeRecords();
};

MockMutationObserver.prototype.takeRecords = function() {
  var records = this._records;
  this._records = [];
  return records;
};

MockMutationObserver.prototype._queueMutation = function(mutation) {
  this._records.push(mutation);
  if (!this._updateQueued) {
    var self = this;
    this._updateQueued = true;
    process.nextTick(function() {
      self._updateQueued = false;
      if (self._records.length) {
        self._callback(self.takeRecords());
      }
    });
  }
};

module.exports = MockMutationObserver;
