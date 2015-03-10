import _ from 'lodash';
import RSVP from 'rsvp';
import ajax from '../../common/ajax';

export default class MessageIdManager {
  constructor({getGmailThreadIdForRfcMessageId, getRfcMessageIdForGmailMessageId, storage, saveThrottle}) {
    this._getGmailThreadIdForRfcMessageId = getGmailThreadIdForRfcMessageId;
    this._getRfcMessageIdForGmailMessageId = getRfcMessageIdForGmailMessageId;
    this._storage = storage || (typeof localStorage !== 'undefined' && localStorage);
    if (saveThrottle === undefined) {
      saveThrottle = 3000;
    }

    this._rfcIdsTimestamps = new Map(); // Map containing times the lookup was last done. Could use for expiration.
    this._rfcIdsToThreadIds = new Map();
    this._threadIdsToRfcIds = new Map();

    this._saveCache = _.throttle(() => {
      if (!this._storage) return;
      // If there are other SDK extensions running too, it's important we load
      // everything from localStorage first before overwriting it.
      this._loadCache();

      const item = [];
      this._rfcIdsToThreadIds.forEach((gmailThreadId, rfcId) => {
        const timestamp = this._rfcIdsTimestamps.get(rfcId);
        item.push([rfcId, gmailThreadId, timestamp]);
      });
      this._storage.setItem('inboxsdk__cached_thread_ids', JSON.stringify(item));
    }, saveThrottle, {leading:false});

    this._loadCache();
  }

  _loadCache() {
    if (!this._storage) return;
    try {
      const item = JSON.parse(this._storage.getItem('inboxsdk__cached_thread_ids'));
      if (item) {
        for (let [rfcId, gmailThreadId, timestamp] of item) {
          this._rfcIdsTimestamps.set(rfcId, timestamp);
          this._rfcIdsToThreadIds.set(rfcId, gmailThreadId);
          this._threadIdsToRfcIds.set(gmailThreadId, rfcId);
        }
      }
    } catch(e) {
      console.error('failed to read cached ids', e);
    }
  }

  _rememberPair(rfcMessageId, gmailThreadId) {
    this._rfcIdsTimestamps.set(rfcMessageId, Date.now());
    this._rfcIdsToThreadIds.set(rfcMessageId, gmailThreadId);
    this._threadIdsToRfcIds.set(gmailThreadId, rfcMessageId);
    this._saveCache();
  }

  _update(rfcMessageId) {
    this._rfcIdsTimestamps.set(rfcMessageId, Date.now());
    this._saveCache();
  }

  getGmailThreadIdForRfcMessageId(rfcMessageId) {
    if (this._rfcIdsToThreadIds.has(rfcMessageId)) {
      this._update(rfcMessageId);
      return RSVP.Promise.resolve(this._rfcIdsToThreadIds.get(rfcMessageId));
    }

    const promise = this._getGmailThreadIdForRfcMessageId(rfcMessageId);
    promise.then(gmailThreadId => {
      this._rememberPair(rfcMessageId, gmailThreadId);
    }, _.noop);
    return promise;
  }

  // Returns an rfc message id of one of the messages in the given thread.
  getRfcMessageIdForGmailThreadId(gmailThreadId) {
    if (this._threadIdsToRfcIds.has(gmailThreadId)) {
      const rfcMessageId = this._threadIdsToRfcIds.get(gmailThreadId);
      this._update(rfcMessageId);
      return RSVP.Promise.resolve(rfcMessageId);
    }

    const promise = this._getRfcMessageIdForGmailMessageId(gmailThreadId);
    promise.then(rfcMessageId => {
      this._rememberPair(rfcMessageId, gmailThreadId);
    }, _.noop);
    return promise;
  }
}
