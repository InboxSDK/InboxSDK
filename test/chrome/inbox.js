/* @flow */
declare var browser;

import fs from 'fs';
import assert from 'assert';
import signIn from './lib/signIn';

describe('Inbox', function() {
  it('works', function() {
    try {
      signIn();

      browser.click('.inboxsdk__appid_warning button.inboxsdk__close_button');

      // Test a regular compose
      const composeButton = browser.execute(() =>
        document.querySelector(`button[aria-labelledby="${Array.prototype.filter.call(document.querySelectorAll('button + label'), el => el.textContent === 'Compose')[0].id}"]`)
      );
      const composeButtonHtml = browser.execute((el) => el.innerHTML, composeButton.value).value;
      composeButton.click();
      try {
        browser.waitForVisible('div[role=dialog] div[jsaction^=compose]');
      } catch (e) {
        console.log('composeButton initial HTML: ', composeButtonHtml);
        throw e;
      }

      assert.strictEqual(browser.getText('.test__tooltipButton'), 'Counter: 0');
      browser.click('.test__tooltipButton');
      assert.strictEqual(browser.getText('.test__tooltipButton'), 'Counter: 1');
      browser.click('div.inboxsdk__button_icon[title="Monkeys!"]');
      assert(!browser.isVisible('.test__tooltipButton'));
      assert(browser.isVisible('div.test__dropdownContent'));
      browser.click('button[jsaction^=compose][jsaction$=discard_draft]');

      // Test an inline compose
      browser.click('.scroll-list-section-body div[role=listitem][data-item-id-qs*="gmail-thread"] span[email="no-reply@accounts.google.com"]');
      // The thread might take some time to load
      browser.waitForVisible('div[jsaction*=quickCompose][jsaction$=quick_compose_handle_focus]', 30*1000);
      browser.pause(500);
      browser.click('div[jsaction*=quickCompose][jsaction$=quick_compose_handle_focus]');
      assert.strictEqual(browser.getText('.test__tooltipButton'), 'Counter: 0');
      browser.click('.test__tooltipButton');
      assert.strictEqual(browser.getText('.test__tooltipButton'), 'Counter: 1');
      browser.click('div.inboxsdk__button_icon[title="Monkeys!"]');
      assert(!browser.isVisible('.test__tooltipButton'));
      assert(browser.isVisible('div.test__dropdownContent'));
      browser.click('button[jsaction^=quickCompose][jsaction$=discard_draft]');
      // make sure discarding the draft has time to save before test ends

      // Test thread sidebar
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

      console.log('test app toolbar button');
      // Test app toolbar button
      browser.click('div[role=button][title="Test App Toolbar Button"]');
      assert.strictEqual(browser.getText('.test__appToolbarCounterButton'), 'Counter: 0');
      browser.click('.test__appToolbarCounterButton');
      assert.strictEqual(browser.getText('.test__appToolbarCounterButton'), 'Counter: 1');
      // second click opens a modal
      browser.click('.test__appToolbarCounterButton');
      assert(browser.isVisible('.test__modalContent'));
      assert.strictEqual(browser.getText('.test__modalContent'), 'modal test');
      browser.click('[role=alertdialog] button[title="Close"]');
      assert(!browser.isVisible('.test__modalContent'));
      browser.waitForVisible('.inboxsdk__inbox_backdrop', undefined, true);

      function switchToOverlayFrame() {
        console.log('switching to overlay frame');
        const frames = browser.elements('iframe:not([src])').value;
        for (let i=0; i<frames.length; i++) {
          browser.frameParent();
          browser.frame(frames[i]);
          console.log('switching to frame: ', i);
          browser.pause(1000);
          // Do .execute() rather than .element() because there seemns to be
          // an issue with querying elements directly after switching frame contexts.
          const el = browser.execute(() => Boolean(document.querySelector('body > div[role=dialog][tabindex]'))).value;
          if (el) return;
        }
        throw new Error('Did not find overlay frame');
      }

      console.log('Test an attachment card inside a message');
      // Test an attachment card inside a message
      browser.scroll('.scroll-list-section-body div[role=listitem][data-item-id-qs*="gmail-thread"] span[email="inboxsdktest@gmail.com"]', 0, -500);
      browser.click('.scroll-list-section-body div[role=listitem][data-item-id-qs*="gmail-thread"] span[email="inboxsdktest@gmail.com"]');
      browser.waitForVisible('section div[title="foo.txt"]', 10*1000);
      browser.pause(500);
      browser.click('section div[title="foo.txt"]'); // click an attachment card
      switchToOverlayFrame();
      console.log('waiting for attachment overlay buttons');
      browser.waitForVisible('button[aria-label="MV"]', 10*1000);
      console.log('found MV, looking for CV');
      browser.waitForVisible('button[aria-label="CV"]', 10*1000);
      console.log('found CV, clicking "Close"');
      browser.click('div[role=button][data-tooltip="Close"]');
      console.log('clicked "Close", switching back to frame parent')
      browser.frameParent();
      browser.pause(1000);
      console.log('switched to frame parent, clicking heading');
      browser.click('div[role=heading]');
      console.log('clicked heading');
      browser.pause(2000);

      console.log('Test an attachment card inside a thread row');
      // Test an attachment card inside a thread row
      browser.waitForVisible('div[role=listitem][title="foo.txt"]', 10*1000);
      browser.pause(500);
      browser.click('div[role=listitem][title="foo.txt"]');
      switchToOverlayFrame();
      browser.waitForVisible('button[aria-label="CV"]', 10*1000);
      browser.click('div[role=button][data-tooltip="Close"]');
      browser.frameParent();
      browser.pause(1000);
      console.log('switched to frame parent, clicking heading');
      browser.click('div[role=heading]');
      console.log('clicked heading');
      browser.pause(2000);

      const threadViewsSeen = browser.execute(() =>
        Number((document.head:any).getAttribute('data-test-threadViewsSeen'))
      ).value;
      assert.strictEqual(threadViewsSeen, 2);

      const messageViewsWithNativeCardsSeen = browser.execute(() =>
        Number((document.head:any).getAttribute('data-test-messageViewsWithNativeCardsSeen'))
      ).value;
      assert.strictEqual(messageViewsWithNativeCardsSeen, 2);
    } catch (err) {
      console.error(err.stack || ('Error: '+err.message));
      if (process.env.CI !== 'true') {
        browser.debug();
      }
      throw err;
    } finally {
      browser.frameParent();
      const errors = browser.execute(() => window._errors).value;
      if (errors.length) {
        console.log('Logged errors:');
        console.log(JSON.stringify(errors, null, 2));
        throw new Error('One or more javascript errors were logged');
      }
    }
  });
});
