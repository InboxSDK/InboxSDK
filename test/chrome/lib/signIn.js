/* @flow */
declare var browser;

import googleTotp from '../../lib/googleTotp';
import readAuthInfo from './readAuthInfo';

export default function signIn() {
  const authInfo = readAuthInfo();

  browser.url('https://inbox.google.com');
  browser.waitForVisible('input[name=Email]');
  browser.setValue('input[name=Email]', 'inboxsdktest@gmail.com');
  browser.click('input#next');
  browser.waitForVisible('input[name=Passwd]');
  browser.setValue('input[name=Passwd]', authInfo['inboxsdktest@gmail.com'].password);
  browser.click('input#signIn');
  browser.waitForVisible('input[name=Pin]');
  browser.setValue('input[name=Pin]', googleTotp(authInfo['inboxsdktest@gmail.com'].twofactor));

  const oldTitle = browser.getTitle();
  browser.click('input#submit');
  browser.waitUntil(() => browser.getTitle() !== oldTitle);

  // Deal with an interstitial page.
  if (!browser.getTitle().startsWith('Inbox ')) {
    const scrolldownBtn = browser.element('div[role=button][aria-label="Scroll to agree"] img[src*="_arrow_down_"]');
    if (scrolldownBtn) {
      scrolldownBtn.click();
    }
    browser.pause(500);
    browser.click('div[role=button]:not([aria-label]):not([title])');
  }

  browser.waitUntil(() => browser.getTitle().startsWith('Inbox '));
}
