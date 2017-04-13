/* @flow */

import _ from 'lodash';
import ajax from '../../common/ajax';

type Options = {
  getGmailThreadIdForRfcMessageId(s: string): Promise<string>;
  getRfcMessageIdForGmailThreadId(s: string): Promise<string>;
  storage?: Storage;
  saveThrottle?: number;
};

// Manages the mapping between RFC Message Ids and Gmail Message Ids. Caches to
// localStorage. Used for custom thread lists.
export default class MessageIdManager {
  _getGmailThreadIdForRfcMessageId: (s: string) => Promise<string>;
  _getRfcMessageIdForGmailThreadId: (s: string) => Promise<string>;
  _storage: ?Storage;
  _rfcIdsTimestamps: Map<string, number>;
  _rfcIdsToThreadIds: Map<string, string>;
  _threadIdsToRfcIds: Map<string, string>;
  _saveCache: () => void;

  constructor({getGmailThreadIdForRfcMessageId, getRfcMessageIdForGmailThreadId, storage, saveThrottle}: Options) {
    this._getGmailThreadIdForRfcMessageId = getGmailThreadIdForRfcMessageId;
    this._getRfcMessageIdForGmailThreadId = getRfcMessageIdForGmailThreadId;
    this._storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (saveThrottle == null) {
      saveThrottle = 3000;
    }

    this._rfcIdsTimestamps = new Map(); // Map containing times the lookup was last done. Could use for expiration.
    this._rfcIdsToThreadIds = new Map();
    this._threadIdsToRfcIds = new Map();

    this._saveCache = _.throttle(() => {
      const storage = this._storage;
      if (!storage) return;
      // If there are other SDK extensions running too, it's important we load
      // everything from localStorage first before overwriting it.
      this._loadCache();

      const item = {version: 2, ids: []};
      this._rfcIdsToThreadIds.forEach((gmailThreadId, rfcId) => {
        const timestamp = this._rfcIdsTimestamps.get(rfcId);
        item.ids.push([rfcId, gmailThreadId, timestamp]);
      });
      storage.setItem('inboxsdk__cached_thread_ids', JSON.stringify(item));
    }, saveThrottle, {leading:false});

    this._loadCache();
  }

  _loadCache() {
    const storage = this._storage;
    if (!storage) return;
    try {
      let item = JSON.parse(storage.getItem('inboxsdk__cached_thread_ids')||'null');
      if (!item) return;
      if (Array.isArray(item)) { // old version
        // There used to be a glitch which could cause the rfcIds to be encoded
        // as HTML, so we fix that up here.
        item = {
          version: 2,
          ids: item.map(([rfcId, gmailThreadId, timestamp]) =>
            [_.unescape(rfcId), gmailThreadId, timestamp]
          )
        };
      }
      if (item.version !== 2) return;
      for (let x of item.ids) {
        const [rfcId, gmailThreadId, timestamp] = x;
        this._rfcIdsTimestamps.set(rfcId, timestamp);
        this._rfcIdsToThreadIds.set(rfcId, gmailThreadId);
        this._threadIdsToRfcIds.set(gmailThreadId, rfcId);
      }
    } catch(e) {
      console.error('failed to read cached ids', e);
    }
  }

  _rememberPair(rfcMessageId: string, gmailThreadId: string) {
    this._rfcIdsTimestamps.set(rfcMessageId, Date.now());
    this._rfcIdsToThreadIds.set(rfcMessageId, gmailThreadId);
    this._threadIdsToRfcIds.set(gmailThreadId, rfcMessageId);
    this._saveCache();
  }

  _update(rfcMessageId: string) {
    this._rfcIdsTimestamps.set(rfcMessageId, Date.now());
    this._saveCache();
  }

  getGmailThreadIdForRfcMessageId(rfcMessageId: string): Promise<string> {
    const gmailThreadId = this._rfcIdsToThreadIds.get(rfcMessageId);
    if (gmailThreadId) {
      this._update(rfcMessageId);
      return Promise.resolve(gmailThreadId);
    }

    const promise = this._getGmailThreadIdForRfcMessageId(rfcMessageId);
    promise.then(gmailThreadId => {
      this._rememberPair(rfcMessageId, gmailThreadId);
    }, _.noop);
    return promise;
  }

  // Returns an rfc message id of one of the messages in the given thread.
  getRfcMessageIdForGmailThreadId(gmailThreadId: string): Promise<string> {
    const rfcMessageId = this._threadIdsToRfcIds.get(gmailThreadId);
    if (rfcMessageId) {
      this._update(rfcMessageId);
      return Promise.resolve(rfcMessageId);
    }

    const promise = this._getRfcMessageIdForGmailThreadId(gmailThreadId);
    promise.then(rfcMessageId => {
      this._rememberPair(rfcMessageId, gmailThreadId);
    }, _.noop);
    return promise;
  }
}
