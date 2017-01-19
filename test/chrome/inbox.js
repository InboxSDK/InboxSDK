/* @flow */
declare var browser;

import fs from 'fs';
import assert from 'assert';
import signIn from './lib/signIn';

describe('Inbox', function() {
  it('ComposeView#addButton', function() {
    try {
      signIn();

      // Test a regular compose
      const composeButton = browser.execute(() =>
        document.querySelector(`button[aria-labelledby="${Array.prototype.filter.call(document.querySelectorAll('button + label'), el => el.textContent === 'Compose')[0].id}"]`)
      );
      composeButton.click();
      browser.waitForVisible('div[role=dialog] div[jsaction^=compose]');
      browser.click('div.inboxsdk__button_icon[title="Monkeys!"]');
      assert(browser.isVisible('div.extension-dropdown-test'));
      browser.click('button[jsaction^=compose][jsaction$=discard_draft]');

      // Test an inline compose
      browser.click('.scroll-list-section-body div[role=listitem][data-item-id-qs*="gmail-thread"] span[email="no-reply@accounts.google.com"]');
      // The thread might take some time to load
      browser.waitForVisible('div[jsaction*=quickCompose][jsaction$=quick_compose_handle_focus]', 30*1000);
      browser.pause(500);
      browser.click('div[jsaction*=quickCompose][jsaction$=quick_compose_handle_focus]');
      browser.click('div.inboxsdk__button_icon[title="Monkeys!"]');
      assert(browser.isVisible('div.extension-dropdown-test'));
      browser.click('button[jsaction^=quickCompose][jsaction$=discard_draft]');
      // make sure discarding the draft has time to save before test ends

      // Test thread sidebar
      assert(browser.isVisible('button[title="Test Sidebar"]'));
      browser.click('button[title="Test Sidebar"]');
      browser.pause(500);
      assert(!browser.isVisible('button[title="Test Sidebar"]'));
      assert(browser.isVisible('.test__sidebarCounterButton'));
      assert.strictEqual(browser.getText('.test__sidebarCounterButton'), 'Counter: 0');
      browser.click('.test__sidebarCounterButton');
      assert.strictEqual(browser.getText('.test__sidebarCounterButton'), 'Counter: 1');
      assert(!browser.isVisible('button[title="Test Sidebar"]'));
      browser.click('button.inboxsdk__close_button');
      browser.pause(500);
      assert(!browser.isVisible('.test__sidebarCounterButton'));
      assert(browser.isVisible('button[title="Test Sidebar"]'));

      function switchToOverlayFrame() {
        const frames = browser.elements('iframe:not([src])').value;
        for (let i=0; i<frames.length; i++) {
          browser.frameParent();
          browser.frame(frames[i]);
          const el = browser.element('body > div[role=dialog][tabindex]').value;
          if (el) return;
        }
        throw new Error('Did not find overlay frame');
      }

      // Test an attachment card inside a message
      browser.scroll('.scroll-list-section-body div[role=listitem][data-item-id-qs*="gmail-thread"] span[email="inboxsdktest@gmail.com"]', 0, -500);
      browser.click('.scroll-list-section-body div[role=listitem][data-item-id-qs*="gmail-thread"] span[email="inboxsdktest@gmail.com"]');
      browser.waitForVisible('section div[title="foo.txt"]', 10*1000);
      browser.pause(500);
      browser.click('section div[title="foo.txt"]'); // click an attachment card
      switchToOverlayFrame();
      browser.waitForVisible('button[aria-label="MV"]', 10*1000);
      browser.waitForVisible('button[aria-label="CV"]', 10*1000);
      browser.click('div[role=button][data-tooltip="Close"]');
      browser.frameParent();
      browser.click('div[role=heading]');
      browser.pause(1000);

      // Test an attachment card inside a thread row
      browser.waitForVisible('div[role=listitem][title="foo.txt"]', 10*1000);
      browser.pause(500);
      browser.click('div[role=listitem][title="foo.txt"]');
      switchToOverlayFrame();
      browser.waitForVisible('button[aria-label="CV"]', 10*1000);
      browser.click('div[role=button][data-tooltip="Close"]');
      browser.frameParent();

      const threadViewsSeen = browser.execute(() =>
        Number(document.head.getAttribute('data-test-threadViewsSeen'))
      ).value;
      assert.strictEqual(threadViewsSeen, 2);

      const messageViewsWithNativeCardsSeen = browser.execute(() =>
        Number(document.head.getAttribute('data-test-messageViewsWithNativeCardsSeen'))
      ).value;
      assert.strictEqual(messageViewsWithNativeCardsSeen, 2);
    } catch (err) {
      console.error('error', err.message);
      console.error(err.stack);
      // browser.debug();
      throw err;
    } finally {
      const errors = browser.execute(() => window._errors).value;
      if (errors.length) {
        console.log('Logged errors:');
        console.log(JSON.stringify(errors, null, 2));
        throw new Error('One or more javascript errors were logged');
      }
    }
  });
});
