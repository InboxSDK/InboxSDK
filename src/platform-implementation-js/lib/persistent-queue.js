// Queue which tries to persist its data into localStorage so its contents
// aren't wiped when the page is closed. It handles localStorage not being
// present or not working (such as if we're running into quota issues).
// Safe for use in multiple tabs on the same domain at once.

function PersistentQueue(id) {
  if (typeof id != "string") {
    throw new Error("PersistentQueue requires a string id");
  }
  this._fallbackQueue = [];
  this._sid = "inboxsdk__persistentqueue_" + id;
}

PersistentQueue.prototype._getSavedQueue = function() {
  var queue = JSON.parse(localStorage.getItem(this._sid));
  if (queue == null) {
    queue = [];
  }
  return queue;
};

PersistentQueue.prototype._putSavedQueue = function(queue) {
  localStorage.setItem(this._sid, JSON.stringify(queue));
};

PersistentQueue.prototype._clearSavedQueue = function() {
  localStorage.removeItem(this._sid);
};

PersistentQueue.prototype.add = function(val) {
  var success = false;
  if (global.localStorage) {
    try {
      var queue = this._getSavedQueue();
      queue.push(val);
      this._putSavedQueue(queue);
      success = true;
    } catch (e) {}
  }
  if (!success) {
    this._fallbackQueue.push(val);
  }
};

PersistentQueue.prototype.remove = function() {
  var ret;
  if (global.localStorage) {
    try {
      var queue = this._getSavedQueue();
      var tmpRet = queue.shift();
      this._putSavedQueue(queue);
      ret = tmpRet;
    } catch (e) {}
  }
  // If we didn't get anything from the localStorage queue, or if we
  // failed to update the queue, then try the fallback instead.
  if (ret === undefined) {
    ret = this._fallbackQueue.shift();
  }
  return ret;
};

PersistentQueue.prototype.removeAll = function() {
  var ret;
  if (global.localStorage) {
    try {
      var queue = this._getSavedQueue();
      this._clearSavedQueue();
      ret = queue;
    } catch (e) {}
  }
  if (ret === undefined) {
    ret = [];
  }
  ret = ret.concat(this._fallbackQueue);
  this._fallbackQueue = [];
  return ret;
};

PersistentQueue.prototype.peekAll = function() {
  var ret;
  if (global.localStorage) {
    try {
      ret = this._getSavedQueue();
    } catch (e) {}
  }
  if (ret === undefined) {
    ret = [];
  }
  ret = ret.concat(this._fallbackQueue);
  return ret;
};

PersistentQueue.prototype.clear = function() {
  if (global.localStorage) {
    try {
      this._clearSavedQueue();
    } catch (e) {}
  }
  this._fallbackQueue.length = 0;
};

module.exports = PersistentQueue;
