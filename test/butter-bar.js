/* @flow */

import _ from 'lodash';
import assert from 'assert';
import sinon from 'sinon';
import co from 'co';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import delay from '../src/common/delay';

import ButterBar from '../src/platform-implementation-js/namespaces/butter-bar';

class MockButterBarDriver {
  _queue: Array<Object>;
  _openBus: Kefir.Bus;
  _showMessageCount: number;
  _currentMessage: ?Object;
  _hideGmailMessageCount: number;

  constructor() {
    this._queue = [];
    this._openBus = kefirBus();
    this._showMessageCount = 0;
    this._currentMessage = null;
    this._hideGmailMessageCount = 0;
  }
  getNoticeAvailableStream() {
    return this._openBus;
  }
  showMessage(options) {
    const num = ++this._showMessageCount;
    this._currentMessage = options;
    return {
      destroy: () => {
        if (num === this._showMessageCount) {
          this._currentMessage = null;
          this._openBus.emit();
        }
      }
    };
  }
  getSharedMessageQueue() {
    return _.cloneDeep(this._queue);
  }
  setSharedMessageQueue(queue) {
    this._queue = _.cloneDeep(queue);
  }
  hideGmailMessage() {
    this._hideGmailMessageCount++;
  }
}

describe("ButterBar", function() {
  describe("showMessage", function() {
    it("doesn't fail", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));
      const options = {text: 'a'};
      const message = butterBar.showMessage(options);
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options);
      message.destroy();
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });

    it("destroys on route change", function(done) {
      const routeViewDriverStream = kefirBus();
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(routeViewDriverStream.toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));
      const message = butterBar.showMessage({text: 'a'});
      // Route view changes shouldn't be listened to immediately by butterbar.
      // This first route view change shouldn't kill things.
      routeViewDriverStream.emit({});
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert(driver.getButterBarDriver()._currentMessage);

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert(driver.getButterBarDriver()._currentMessage);
        routeViewDriverStream.emit({});
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
        done();
      }, 1);
    });

    it("destroys after given time passes", function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));
      const message = butterBar.showMessage({text: 'a', time:1});

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert(driver.getButterBarDriver()._currentMessage);

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
        done();
      }, 1);
    });

    it("low priority messages don't interrupt higher priority messages", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));
      const options1 = {text: 'a', priority: 2};
      const message1 = butterBar.showMessage(options1);
      const options2 = {text: 'b', priority: 1};
      const message2 = butterBar.showMessage(options2);
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);
      message1.destroy();
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
      message2.destroy();
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });

    it("low priority persistent messages queue up", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));
      const options1 = {text: 'a', priority: 2};
      const message1 = butterBar.showMessage(options1);
      const options2 = {text: 'b', priority: 1, persistent: true};
      const message2 = butterBar.showMessage(options2);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      const options3 = {text: 'c', priority: 2};
      const message3 = butterBar.showMessage(options3);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options3);

      message1.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options3);

      message3.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 3);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options2);

      message2.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 3);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });

    it("messages of equal or higher priority interrupt others", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      const options1 = {text: 'a', priority: 2};
      const message1 = butterBar.showMessage(options1);
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      const options2 = {text: 'b', priority: 2};
      const message2 = butterBar.showMessage(options2);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options2);

      message1.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options2);

      message2.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });

    it("interrupted messages come back if they're persistent", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      const options1 = {text: 'a', priority: 2, persistent: true};
      const message1 = butterBar.showMessage(options1);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      const options2 = {text: 'b', priority: 2};
      const message2 = butterBar.showMessage(options2);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options2);

      message2.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 3);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      message1.destroy();

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 3);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });
  });

  describe("showSaving", function() {
    it('resolves', function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 0);

      const options1 = {};
      const message1 = butterBar.showSaving(options1);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      message1.resolve();

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
        assert.notStrictEqual(driver.getButterBarDriver()._currentMessage, options1);
        assert(driver.getButterBarDriver()._currentMessage);
        done();
      }, 4);
    });

    it('respects showConfirmation', function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 0);

      const options1 = {showConfirmation: false};
      const message1 = butterBar.showSaving(options1);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      message1.resolve();

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
        done();
      }, 4);
    });

    it('rejects', function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 0);

      const options1 = {};
      const message1 = butterBar.showSaving(options1);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      message1.reject();

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
        done();
      }, 4);
    });

    it('has a high priority saved message', function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 0);

      const options1 = {text: 'blah'};
      const message1 = butterBar.showMessage(options1);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      const options2 = {};
      const message2 = butterBar.showSaving(options2);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      message2.resolve();

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 2);
        assert.notStrictEqual(driver.getButterBarDriver()._currentMessage, options1);
        assert.notStrictEqual(driver.getButterBarDriver()._currentMessage, options2);
        assert(driver.getButterBarDriver()._currentMessage);
        message1.destroy();
        done();
      }, 4);
    });
  });

  describe("hideMessage", function() {
    it("works", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      const options1 = {text: 'a', messageKey: {}, priority: 100};
      const message1 = butterBar.showMessage(options1);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      butterBar.hideMessage({});

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options1);

      butterBar.hideMessage(options1.messageKey);

      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });
  });

  describe("hideGmailMessage", function() {
    it("calls driver", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Kefir.never().toProperty())
      };
      const butterBar = new ButterBar('test', (driver: any));

      assert.strictEqual(driver.getButterBarDriver()._hideGmailMessageCount, 0);
      butterBar.hideGmailMessage();
      assert.strictEqual(driver.getButterBarDriver()._hideGmailMessageCount, 1);
    });
  });
});
