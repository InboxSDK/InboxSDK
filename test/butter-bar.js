import _ from 'lodash';
import assert from 'assert';
import sinon from 'sinon';
import Bacon from 'baconjs';

import ButterBar from '../src/platform-implementation-js/platform-implementation/butter-bar';

class MockButterBarDriver {
  constructor() {
    this._queue = [];
    this._openBus = new Bacon.Bus();
    this._showMessageCount = 0;
    this._currentMessage = null;
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
          this._openBus.push();
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
}

describe("ButterBar", function() {
  describe("showMessage", function() {
    it("doesn't fail", function() {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Bacon.never())
      };
      const butterBar = new ButterBar('test', driver);
      const options = {text: 'a'};
      const message = butterBar.showMessage(options);
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, options);
      message.destroy();
      assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
    });

    it("destroys on route change", function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(new Bacon.Bus())
      };
      const butterBar = new ButterBar('test', driver);
      const message = butterBar.showMessage({text: 'a'});
      // Route view changes shouldn't be listened to immediately by butterbar.
      // This first route view change shouldn't kill things.
      driver.getRouteViewDriverStream().push({});
      assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
      assert(driver.getButterBarDriver()._currentMessage);

      setTimeout(() => {
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert(driver.getButterBarDriver()._currentMessage);
        driver.getRouteViewDriverStream().push({});
        assert.strictEqual(driver.getButterBarDriver()._showMessageCount, 1);
        assert.strictEqual(driver.getButterBarDriver()._currentMessage, null);
        done();
      }, 0);
    });

    it("destroys after given time passes", function(done) {
      const driver = {
        getButterBarDriver: _.constant(new MockButterBarDriver()),
        getRouteViewDriverStream: _.constant(Bacon.never())
      };
      const butterBar = new ButterBar('test', driver);
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
        getRouteViewDriverStream: _.constant(Bacon.never())
      };
      const butterBar = new ButterBar('test', driver);
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
        getRouteViewDriverStream: _.constant(Bacon.never())
      };
      const butterBar = new ButterBar('test', driver);
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
        getRouteViewDriverStream: _.constant(Bacon.never())
      };
      const butterBar = new ButterBar('test', driver);

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
        getRouteViewDriverStream: _.constant(Bacon.never())
      };
      const butterBar = new ButterBar('test', driver);

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
});
