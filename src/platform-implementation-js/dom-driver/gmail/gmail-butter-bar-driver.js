import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';

export default class GmailButterBarDriver {
  constructor() {
    this.getNoticeAvailableStream = _.once(() => {
      return Bacon.never();
    });
  }

  getSharedMessageQueue() {
    const attr = document.head.getAttribute('data-inboxsdk-butterbar-queue');
    return attr ? JSON.parse(attr) : [];
  }

  setSharedMessageQueue(queue) {
    const attr = JSON.stringify(queue);
    document.head.setAttribute('data-inboxsdk-butterbar-queue', attr);
  }

  showMessage(rawOptions) {
    alert(rawOptions.text);
    return {
      destroy() { alert('destroy'); }
    };
  }
}
