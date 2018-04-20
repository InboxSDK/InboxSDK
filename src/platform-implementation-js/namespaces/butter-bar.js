/* @flow */

import defaults from 'lodash/defaults';
import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import getStackTrace from '../../common/get-stack-trace';
import get from '../../common/get-or-fail';
import type {Driver} from '../driver-interfaces/driver';

const ancientComplainTime = 2 * 60 * 1000;
const dummyPacket = Object.freeze({
  destroy: Object.freeze(function(){})
});

const memberMap = new WeakMap();

type Message = {
  destroy(): void;
};

// documented in src/docs/
export default class ButterBar {

  constructor(appId: string, driver: Driver) {
    const members = {};
    memberMap.set(this, members);

    members.driver = driver;
    members.messagesByKey = new Map();
    members.queuedPackets = [];
  }

  showMessage(options: Object): Message {
    defaults(options, {
      priority: 0,
      time: 15*1000,
      hideOnViewChanged: true,
      persistent: false
    });
    this.hideMessage(options.messageKey);

    const members = get(memberMap, this);
    const butterBarDriver = members.driver.getButterBarDriver();
    const messageId = Date.now()+'-'+Math.random();

    {
      let queue = butterBarDriver.getSharedMessageQueue();
      queue.unshift({
        messageId, priority: options.priority, persistent: options.persistent});
      queue = sortBy(queue, item => -item.priority);
      queue = queue.filter((item, i) => i===0 || item.persistent);
      butterBarDriver.setSharedMessageQueue(queue);

      if (!find(queue, item => item.messageId === messageId)) {
        return dummyPacket;
      }
    }

    const stopper = kefirBus();

    if (options.hideOnViewChanged) {
      // Set hideOnViewChanged to true only after this run of the event
      // loop completes. This fixes the issue where a butterbar message
      // with hideOnViewChanged spawned in a gmail viewChanged handler
      // would die immediately as the rest of the event's handlers are
      // called.
      stopper.plug(
        Kefir.later(0, null).flatMap(
          () => members.driver.getRouteViewDriverStream().changes()
        ).map(() => null)
      );
    }

    if (isFinite(options.time)) {
      stopper.plug(Kefir.later(options.time, null));
    }

    // Error made here for sensible stack
    const timeoutErr = new Error("Butter bar message timed out");
    stopper.plug(Kefir.later(ancientComplainTime, null).map((x) => {
      members.driver.getLogger().errorApp(timeoutErr);
      return x;
    }));

    stopper.take(1).onValue(() => {
      if (options.messageKey) {
        members.messagesByKey.delete(options.messageKey);
      }
      const queue = butterBarDriver.getSharedMessageQueue();
      butterBarDriver.setSharedMessageQueue(
        queue.filter(item => item.messageId !== messageId));
    });

    butterBarDriver.getNoticeAvailableStream()
      .toProperty(() => null)
      .takeUntilBy(stopper)
      .filter(() => {
        const queue = butterBarDriver.getSharedMessageQueue();
        if (!queue[0]) stopper.emit();
        return queue[0] && queue[0].messageId === messageId;
      })
      .onValue(() => {
        const rawHandle = butterBarDriver.showMessage(options);
        stopper.take(1).onValue(() => {
          rawHandle.destroy();
        });
      });

    const message = {
      destroy() { stopper.emit(); }
    };
    if (options.messageKey) {
      members.messagesByKey.set(options.messageKey, message);
    }
    return message;
  }

  showLoading(options: Object ={}): Message {
    defaults(options, {
      text: 'Loading...',
      priority: -3,
      time: Infinity,
      persistent: true,
      hideOnViewChanged: true
    });

    options.time = Infinity; // Loading messages should exist until destroyed.

    return this.showMessage(options);
  }

  showError(options: Object): Message {
    defaults(options, {
      priority: 100,
      className: 'inboxsdk__butterbar_error'
    });
    return this.showMessage(options);
  }

  showSaving(options: Object={}): Object {
    defaults(options, {
      text: 'Saving...',
      confirmationText: 'Saved',
      confirmationTime: 1*1000,
      priority: -2,
      time: Infinity,
      persistent: true,
      hideOnViewChanged: false,
      showConfirmation: true
    });
    const savingMessage = this.showMessage(options);

    const defer = RSVP.defer();

    defer.promise.then(() => {
      savingMessage.destroy();
      if (options.showConfirmation) {
        this.showMessage({
          text: options.confirmationText,
          messageKey: options.messageKey,
          time: options.confirmationTime,
          priority: 200
        });
      }
    }, () => {
      savingMessage.destroy();
    });

    return defer;
  }

  hideMessage(messageKey: Object | string) {
    if (messageKey) {
      const members = get(memberMap, this);
      const message = members.messagesByKey.get(messageKey);
      if (message) {
        message.destroy();
      }
    }
  }

  hideGmailMessage() {
    const members = get(memberMap, this);
    const butterBarDriver = members.driver.getButterBarDriver();

    butterBarDriver.hideGmailMessage();
  }

}
