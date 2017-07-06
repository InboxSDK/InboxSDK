/* @flow */

// Queue which tries to persist its data into localStorage so its contents
// aren't wiped when the page is closed. It handles localStorage not being
// present or not working (such as if we're running into quota issues).
// Safe for use in multiple tabs on the same domain at once.

class PersistentQueue<T> {
  _fallbackQueue: T[];
  _sid: string;

  constructor(id: string) {
    this._fallbackQueue = [];
    this._sid = "inboxsdk__persistentqueue_" + id;
  }

  _getSavedQueue(): T[] {
    var queue = JSON.parse((localStorage.getItem(this._sid): any));
    if (queue == null) {
      queue = [];
    }
    return queue;
  }

  _putSavedQueue(queue: T[]) {
    localStorage.setItem(this._sid, JSON.stringify(queue));
  }

  _clearSavedQueue() {
    localStorage.removeItem(this._sid);
  }

  add(val: T) {
    var success = false;
    if (global.localStorage) {
      try {
        var queue = this._getSavedQueue();
        queue.push(val);
        this._putSavedQueue(queue);
        success = true;
      } catch (e) {
        // ignore
      }
    }
    if (!success) {
      this._fallbackQueue.push(val);
    }
  }

  remove(): T {
    var ret;
    if (global.localStorage) {
      try {
        var queue = this._getSavedQueue();
        var tmpRet = queue.shift();
        this._putSavedQueue(queue);
        ret = tmpRet;
      } catch (e) {
        // ignore
      }
    }
    // If we didn't get anything from the localStorage queue, or if we
    // failed to update the queue, then try the fallback instead.
    if (ret === undefined) {
      ret = this._fallbackQueue.shift();
    }
    return ret;
  }

  removeAll(): T[] {
    var ret;
    if (global.localStorage) {
      try {
        var queue = this._getSavedQueue();
        this._clearSavedQueue();
        ret = queue;
      } catch (e) {
        // ignore
      }
    }
    if (ret === undefined) {
      ret = [];
    }
    ret = ret.concat(this._fallbackQueue);
    this._fallbackQueue = [];
    return ret;
  }

  peekAll(): T[] {
    var ret;
    if (global.localStorage) {
      try {
        ret = this._getSavedQueue();
      } catch (e) {
        // ignore
      }
    }
    if (ret === undefined) {
      ret = [];
    }
    ret = ret.concat(this._fallbackQueue);
    return ret;
  }

  clear() {
    if (global.localStorage) {
      try {
        this._clearSavedQueue();
      } catch (e) {
        // ignore
      }
    }
    this._fallbackQueue.length = 0;
  }
}

export default PersistentQueue;
