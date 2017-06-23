/* @flow */
declare var browser;
declare var $;

import fs from 'fs';
import assert from 'assert';
import signIn from './lib/signIn';

describe('Inbox', function() {
  it('works', function() {
    try {
      signIn();

      browser.click('.inboxsdk__appid_warning button.inboxsdk__close_button');

      const headEl = $('head');

      // Test a regular compose
      const composeButton = browser.execute(() =>
        document.querySelector(`button[aria-labelledby="${Array.prototype.filter.call(document.querySelectorAll('button + label'), el => el.textContent === 'Compose')[0].id}"]`)
      );
      composeButton.click();
      browser.waitForVisible('div[role=dialog] div[jsaction^=compose]', 10*1000);

      assert.strictEqual(browser.getText('.test__tooltipButton'), 'Counter: 0');
      browser.click('.test__tooltipButton');
      assert.strictEqual(browser.getText('.test__tooltipButton'), 'Counter: 1');
      browser.click('div.inboxsdk__button_icon[title="Monkeys!"]');
      assert(!browser.isVisible('.test__tooltipButton'));
      assert(browser.isVisible('div.test__dropdownContent'));
      browser.click('button[jsaction^=compose][jsaction$=discard_draft]');
      assert.strictEqual(
        Number(headEl.getAttribute('data-test-composeDiscardEmitted')),
        1
      );
      assert.strictEqual(
        Number(headEl.getAttribute('data-test-composeDestroyEmitted')),
        1
      );
      {
        // Test presending/sending/sent events
        composeButton.click();
        browser.waitForVisible('div[role=dialog] div[jsaction^=compose]', 10*1000);
        const toField = browser.$$('div[role=dialog] input[aria-label="To"]').find((el) => (
          el.isVisible()
        ));
        const subject = $('div[role=dialog] input[title="Subject"]');
        const body = $('div[role=dialog] [aria-label="Body, Say something"]');
        toField.click();
        toField.keys('tesla@streak.com');
        toField.keys(['Enter']);
        subject.click();
        subject.keys(`InboxSDK Inbox ComposeView events test @ ${new Date().getTime()}`);
        body.click();
        body.keys('Test message!');
        browser.click('div[role=dialog] [jsaction$="send"]');
        browser.waitUntil(() => (
          Number(headEl.getAttribute('data-test-composeSentEmitted')) === 1
        ), 20 * 1000);
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composePresendingEmitted')),
          1
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeSendingEmitted')),
          1
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeSentEmitted')),
          1
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeDestroyEmitted')),
          2
        );
      }

      {
        // Test canceling send
        composeButton.click();
        browser.waitForVisible('div[role=dialog] div[jsaction^=compose]', 10*1000);
        const toField = browser.$$('div[role=dialog] input[aria-label="To"]').find((el) => (
          el.isVisible()
        ));
        const subject = $('div[role=dialog] input[title="Subject"]');
        const body = $('div[role=dialog] [aria-label="Body, Say something"]');
        toField.click();
        toField.keys('tesla@streak.com');
        toField.keys(['Enter']);
        subject.click();
        subject.keys(`InboxSDK Inbox ComposeView cancel send test @ ${new Date().getTime()}`);
        body.click();
        body.keys('Test message!');
        browser.click('div[role=dialog] [jsaction$=send]');
        browser.waitUntil(() => (
          Number(headEl.getAttribute('data-test-composePresendingEmitted')) === 2
        ), 10 * 1000);
        assert(browser.isVisible('div[role=dialog] div[jsaction^=compose]', 1000));
        browser.click('button[jsaction^=compose][jsaction$=discard_draft]');
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composePresendingEmitted')),
          2
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeSendCanceledEmitted')),
          1
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeSendingEmitted')),
          1
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeSentEmitted')),
          1
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeDiscardEmitted')),
          2
        );
        assert.strictEqual(
          Number(headEl.getAttribute('data-test-composeDestroyEmitted')),
          3
        );
      }

      // Test an inline compose
      browser.click('.scroll-list-section-body div[role=listitem][data-item-id-qs*="thread-"] span[email="no-reply@accounts.google.com"]');
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
      assert.strictEqual(
        Number(headEl.getAttribute('data-test-composeDiscardEmitted')),
        3
      );
      assert.strictEqual(
        Number(headEl.getAttribute('data-test-composeDestroyEmitted')),
        4
      );
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
      browser.scroll('.scroll-list-section-body div[role=listitem][data-item-id-qs*="thread-"] span[email="inboxsdktest@gmail.com"]', 0, -500);
      browser.click('.scroll-list-section-body div[role=listitem][data-item-id-qs*="thread-"] span[email="inboxsdktest@gmail.com"]');
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

      // Search Suggestions
      console.log('Search Suggestions');
      // TODO currently not testing navigation to custom views, should
      // add tests for that when we start supporting them in earnest.
      const searchInput = $(
        'nav[role=banner] div[role=search] input[placeholder="Search"]'
      );
      searchInput.click();
      browser.pause(1000); // Wait for animations/transitions to settle
      searchInput.keys('ab');
      const resultsList = $(
        'div[jsaction="clickonly:global.empty_space_click"] div[role=listbox] ul:last-of-type'
      );
      resultsList.waitForVisible(5000);
      const firstResultSet = resultsList.$$('li.inboxsdk__search_suggestion');
      assert.strictEqual(firstResultSet.length, 2);
      const inboxTabId = browser.getCurrentTabId();
      firstResultSet[0].click();
      browser.waitUntil(() => browser.getTabIds().length > 1, 5000);
      const externalUrlTabId = browser.getTabIds().find((id) => id !== inboxTabId);
      browser.switchTab(externalUrlTabId);
      browser.waitUntil(() => {
        const currentUrl = browser.execute(() => window.location.origin).value;
        return currentUrl != null && currentUrl != 'null';
      });
      const currentUrl = browser.execute(() => window.location.origin).value;
      assert.strictEqual(currentUrl, 'https://www.google.com');
      browser.close();
      browser.pause(2000);
      firstResultSet[1].click();
      searchInput.click();
      // For some reason Chrome/Inbox get grumpy if you try to send keystrokes
      // too soon after switching back from a different tab...
      searchInput.keys('b');
      // If we don't wait for a length of 1, we will most likely end up selecting
      // the first result set because it hasn't been removed yet.
      browser.waitUntil(() => (
        resultsList.$$('li.inboxsdk__search_suggestion').length === 1
      ), 5000);
      const secondResultSet = resultsList.$$('li.inboxsdk__search_suggestion');
      assert.strictEqual(secondResultSet.length, 1);
      assert(browser.isExisting(
        'li.inboxsdk__search_suggestion span.test__suggestionName'
      ));
      assert(browser.isExisting(
        'li.inboxsdk__search_suggestion span.test__suggestionDesc'
      ));
      secondResultSet[0].click();
      const searchSugggestionsClicked1 = browser.execute(() =>
        Number((document.head:any).getAttribute('data-test-searchSuggestionsClicked1'))
      ).value;
      const searchSugggestionsClicked2 = browser.execute(() =>
        Number((document.head:any).getAttribute('data-test-searchSuggestionsClicked2'))
      ).value;
      assert.strictEqual(searchSugggestionsClicked1, 1);
      assert.strictEqual(searchSugggestionsClicked2, 1);
      searchInput.click();
      searchInput.keys('abc');
      browser.waitUntil(() => (
        resultsList.$$('li.inboxsdk__search_suggestion').length === 3
      ), 5000);
      assert.strictEqual(resultsList.$$('li.inboxsdk__search_suggestion').length, 3);
      assert.strictEqual(resultsList.$$('div.inboxsdk__search_suggestion_group').length, 2);
      let seenSelectedSearchResult = false;
      for (let i = 0; i < 50; i++) {
        searchInput.keys(['ArrowDown']);
        if (
          resultsList.$$('li.inboxsdk__search_suggestion.inboxsdk__selected').length === 1
        ) {
          seenSelectedSearchResult = true;
          break;
        }
      }
      assert(seenSelectedSearchResult);
      let allResultsDeselected = false;
      for (let i = 0; i < 50; i++) {
        searchInput.keys(['ArrowDown']);
        if (
          resultsList.$$('li.inboxsdk__search_suggestion.inboxsdk__selected').length === 0
        ) {
          allResultsDeselected = true;
          break;
        }
      }
      assert(allResultsDeselected);
      searchInput.click();
      searchInput.keys(['Enter']);
      browser.waitUntil(() => (
        !resultsList.isVisible()
      ), 5000);
      assert(!resultsList.isVisible());
      searchInput.click();
      searchInput.keys('a');
      browser.waitUntil(() => (
        resultsList.$$('li.inboxsdk__search_suggestion').length === 2
      ), 5000);
      searchInput.keys(['Tab']);
      browser.waitUntil(() => (
        !resultsList.isVisible()
      ), 5000);
      assert(!resultsList.isVisible());

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
