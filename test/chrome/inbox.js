/* @flow */
declare var browser;

import fs from 'fs';
import assert from 'assert';
import signIn from './lib/signIn';

describe('Inbox', function() {
  it('ComposeView#addButton', function() {
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
    browser.click('.scroll-list-section-body div[role=listitem][jsinstance*="gmail:thread"]');
    browser.pause(1500);
    browser.click('div[jsaction*=quickCompose][jsaction$=quick_compose_handle_focus]');
    browser.click('div.inboxsdk__button_icon[title="Monkeys!"]');
    assert(browser.isVisible('div.extension-dropdown-test'));
    browser.click('button[jsaction^=quickCompose][jsaction$=discard_draft]');
  });
});
