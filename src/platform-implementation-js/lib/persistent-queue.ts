// Queue which tries to persist its data into localStorage so its contents
// aren't wiped when the page is closed. It handles localStorage not being
// present or not working (such as if we're running into quota issues).
// Safe for use in multiple tabs on the same domain at once.

export default class PersistentQueue<T> {
  private _fallbackQueue: T[] = [];
  private _sid: string;

  constructor(id: string) {
    this._sid = 'inboxsdk__persistentqueue_' + id;
  }

  private _getSavedQueue(): T[] {
    let queue = JSON.parse(localStorage.getItem(this._sid) as any);
    if (queue == null) {
      queue = [];
    }
    return queue;
  }

  private _putSavedQueue(queue: T[]) {
    localStorage.setItem(this._sid, JSON.stringify(queue));
  }

  private _clearSavedQueue() {
    localStorage.removeItem(this._sid);
  }

  add(val: T) {
    let success = false;
    if (typeof localStorage !== 'undefined') {
      try {
        const queue = this._getSavedQueue();
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

  remove(): T | undefined {
    let ret;
    if (typeof localStorage !== 'undefined') {
      try {
        const queue = this._getSavedQueue();
        const tmpRet = queue.shift();
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
    let ret: any[] | void = undefined;
    if (typeof localStorage !== 'undefined') {
      try {
        const queue = this._getSavedQueue();
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
    let ret: any[] | void = undefined;
    if (typeof localStorage !== 'undefined') {
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
    if (typeof localStorage !== 'undefined') {
      try {
        this._clearSavedQueue();
      } catch (e) {
        // ignore
      }
    }
    this._fallbackQueue.length = 0;
  }
}
