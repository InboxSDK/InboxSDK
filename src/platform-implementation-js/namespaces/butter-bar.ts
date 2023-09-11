import defaults from 'lodash/defaults';
import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import defer from '../../common/defer';
import get from '../../common/get-or-fail';
import { Driver, ButterBarMessage } from '../driver-interfaces/driver';

const ancientComplainTime = 2 * 60 * 1000;
const dummyPacket = Object.freeze({
  destroy: Object.freeze(function () {
    // do nothing
  }),
});

const memberMap = new WeakMap<
  ButterBar,
  {
    driver: Driver;
    messagesByKey: Map<string, ButterBarMessage>;
    queuedPackets: any[];
  }
>();

// documented in src/docs/
export default class ButterBar {
  constructor(appId: string, driver: Driver) {
    const members = {
      driver,
      messagesByKey: new Map(),
      queuedPackets: [],
    };
    memberMap.set(this, members);
  }

  showMessage(options: any): ButterBarMessage {
    defaults(options, {
      priority: 0,
      time: 15 * 1000,
      hideOnViewChanged: true,
      persistent: false,
    });
    this.hideMessage(options.messageKey);

    const members = get(memberMap, this);
    const butterBarDriver = members.driver.getButterBarDriver();
    const messageId = Date.now() + '-' + Math.random();

    {
      let queue = butterBarDriver.getSharedMessageQueue();
      queue.unshift({
        messageId,
        priority: options.priority,
        persistent: options.persistent,
      });
      queue = sortBy(queue, (item) => -item.priority);
      queue = queue.filter((item, i) => i === 0 || item.persistent);
      butterBarDriver.setSharedMessageQueue(queue);

      if (!find(queue, (item) => item.messageId === messageId)) {
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
        Kefir.later(0, null)
          .flatMap(() => members.driver.getRouteViewDriverStream().changes())
          .map(() => null),
      );
    }

    if (isFinite(options.time)) {
      stopper.plug(Kefir.later(options.time, null));
    }

    // Error made here for sensible stack
    const timeoutErr = new Error('Butter bar message timed out');
    stopper.plug(
      Kefir.later(ancientComplainTime, null).map((x) => {
        members.driver.getLogger().errorApp(timeoutErr);
        return x;
      }),
    );

    stopper.take(1).onValue(() => {
      if (options.messageKey) {
        members.messagesByKey.delete(options.messageKey);
      }
      const queue = butterBarDriver.getSharedMessageQueue();
      butterBarDriver.setSharedMessageQueue(
        queue.filter((item) => item.messageId !== messageId),
      );
    });

    butterBarDriver
      .getNoticeAvailableStream()
      .toProperty(() => null)
      .takeUntilBy(stopper)
      .filter(() => {
        const queue = butterBarDriver.getSharedMessageQueue();
        if (!queue[0]) stopper.value(undefined);
        return queue[0] && queue[0].messageId === messageId;
      })
      .onValue(() => {
        const rawHandle = butterBarDriver.showMessage(options);
        stopper.take(1).onValue(() => {
          rawHandle.destroy();
        });
      });

    const message = {
      destroy() {
        stopper.value(undefined);
      },
    };
    if (options.messageKey) {
      members.messagesByKey.set(options.messageKey, message);
    }
    return message;
  }

  showLoading(options: any = {}): ButterBarMessage {
    defaults(options, {
      text: 'Loading...',
      priority: -3,
      time: Infinity,
      persistent: true,
      hideOnViewChanged: true,
    });

    options.time = Infinity; // Loading messages should exist until destroyed.

    return this.showMessage(options);
  }

  showError(options: any): ButterBarMessage {
    defaults(options, {
      priority: 100,
      className: 'inboxsdk__butterbar_error',
    });
    return this.showMessage(options);
  }

  showSaving(options: any = {}): any {
    defaults(options, {
      text: 'Saving...',
      confirmationText: 'Saved',
      confirmationTime: 1 * 1000,
      priority: -2,
      time: Infinity,
      persistent: true,
      hideOnViewChanged: false,
      showConfirmation: true,
    });
    const savingMessage = this.showMessage(options);

    const deferred = defer();

    deferred.promise.then(
      () => {
        savingMessage.destroy();
        if (options.showConfirmation) {
          this.showMessage({
            text: options.confirmationText,
            messageKey: options.messageKey,
            time: options.confirmationTime,
            priority: 200,
          });
        }
      },
      () => {
        savingMessage.destroy();
      },
    );

    return deferred;
  }

  hideMessage(messageKey: any | string) {
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
