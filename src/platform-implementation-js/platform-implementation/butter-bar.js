const _ = require('lodash');
const RSVP = require('rsvp');
const Bacon = require('baconjs');
const getStackTrace = require('../../common/get-stack-trace');

const ancientComplainTime = 2 * 60 * 1000;
const dummyPacket = Object.freeze({
  destroy: Object.freeze(function(){})
});

const memberMap = new WeakMap();

// documented in src/docs/
function ButterBar(appId, driver) {
  const members = {};
  memberMap.set(this, members);

  members.driver = driver;
  members.messagesByKey = new Map();
  members.queuedPackets = [];
}

_.extend(ButterBar.prototype, {

  showMessage(options) {
    _.defaults(options, {
      priority: 0,
      time: 15*1000,
      hideOnViewChanged: true,
      persistent: false
    });
    this.hideMessage(options.messageKey);

    const members = memberMap.get(this);
    const butterBarDriver = members.driver.getButterBarDriver();
    const messageId = Date.now()+'-'+Math.random();

    {
      let queue = butterBarDriver.getSharedMessageQueue();
      queue.unshift({
        messageId, priority: options.priority, persistent: options.persistent});
      queue = _.sortBy(queue, item => -item.priority);
      queue = queue.filter((item, i) => i===0 || item.persistent);
      butterBarDriver.setSharedMessageQueue(queue);

      if (!_.find(queue, item => item.messageId === messageId)) {
        return dummyPacket;
      }
    }

    const stopper = new Bacon.Bus();

    if (options.hideOnViewChanged) {
      // Set hideOnViewChanged to true only after this run of the event
      // loop completes. This fixes the issue where a butterbar message
      // with hideOnViewChanged spawned in a gmail viewChanged handler
      // would die immediately as the rest of the event's handlers are
      // called.
      stopper.plug(
        Bacon.later(0, null).flatMap(
          members.driver.getRouteViewDriverStream().changes()
        ).map(null)
      );
    }

    if (isFinite(options.time)) {
      stopper.plug(Bacon.later(options.time, null));
    }

    // Error made here for sensible stack
    const timeoutErr = new Error("Butter bar message timed out");
    stopper.plug(Bacon.later(ancientComplainTime, null).doAction(() => {
      members.driver.getLogger().errorApp(timeoutErr);
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
      .toProperty(null)
      .takeUntil(stopper)
      .filter(() => {
        const queue = butterBarDriver.getSharedMessageQueue();
        if (!queue[0]) stopper.push();
        return queue[0] && queue[0].messageId === messageId;
      })
      .onValue(() => {
        const rawHandle = butterBarDriver.showMessage(options);
        stopper.take(1).onValue(() => {
          rawHandle.destroy();
        });
      });

    const message = {
      destroy() { stopper.push(); }
    };
    if (options.messageKey) {
      members.messagesByKey.set(options.messageKey, message);
    }
    return message;
  },

  showLoading(options={}) {
    _.defaults(options, {
      text: 'Loading...',
      priority: -3,
      time: Infinity,
      persistent: true,
      hideOnViewChanged: true
    });
    return this.showMessage(options);
  },

  showError(options) {
    _.defaults(options, {
      priority: 100
    });
    return this.showMessage(options);
  },

  showSaving(options={}) {
    _.defaults(options, {
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
  },

  hideMessage(messageKey) {
    if (messageKey) {
      const members = memberMap.get(this);
      const message = members.messagesByKey.get(messageKey);
      if (message) {
        message.destroy();
      }
    }
  },

  hideGmailMessage() {
    const members = memberMap.get(this);
    const butterBarDriver = members.driver.getButterBarDriver();

    butterBarDriver.hideGmailMessage();
  }

});

module.exports = ButterBar;
